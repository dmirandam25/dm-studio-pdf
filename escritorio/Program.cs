// DM Studio · PDF — programa de escritorio (antes Folio PDF).
// Lleva la app dentro (app.zip) y la muestra en su propia ventana con WebView2 (el motor web
// que trae Windows), sin navegador. La app se sirve solo dentro del equipo (127.0.0.1).
// Los archivos pasados al programa (doble clic en un PDF, «Abrir con») se abren en Folio.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("DM Studio · PDF")]
[assembly: AssemblyProduct("DM Studio · PDF")]
[assembly: AssemblyDescription("Editor de PDF local y privado")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

static class FolioPDF
{
    const int PORT = 5180;
    const string WV2 = "1.0.3240.44";
    public static readonly string URL = "http://127.0.0.1:" + PORT + "/";
    public static readonly string DATA = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FolioPDF");
    static readonly Dictionary<string, byte[]> files = new Dictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);
    static readonly Dictionary<string, string> queued = new Dictionary<string, string>();
    static readonly List<string> pending = new List<string>();
    static readonly object gate = new object();
    static int nextId = 1;
    static string token;
    public static Form window;
    // clave que solo conoce la ventana de Folio (se le inyecta al cargar): protege guardar en disco
    public static readonly string pageKey = Guid.NewGuid().ToString("N");
    static readonly HashSet<string> allowedFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    static readonly HashSet<string> allowedDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetDllDirectory(string path);

    [STAThread]
    static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Directory.CreateDirectory(DATA);
        // Serialize startup so a second launch cannot observe the token before the
        // first process has started its HTTP listener (the file-open handoff).
        using (Mutex startup = new Mutex(false, @"Local\FolioPDF.Startup"))
        {
            bool ownsStartup = false;
            try { ownsStartup = startup.WaitOne(30000); }
            catch (AbandonedMutexException) { ownsStartup = true; }
            if (!ownsStartup)
            {
                MessageBox.Show("DM Studio · PDF está tardando en iniciar. Vuelve a abrir el archivo cuando aparezca la ventana.", "DM Studio · PDF");
                return;
            }
            try { Start(args, delegate { startup.ReleaseMutex(); ownsStartup = false; }); }
            finally { if (ownsStartup) startup.ReleaseMutex(); }
        }
    }

    static void Start(string[] args, Action releaseStartup)
    {
        string tokenFile = Path.Combine(DATA, "token.txt");
        List<string> docs = new List<string>();
        foreach (string a in args) if (File.Exists(a)) docs.Add(Path.GetFullPath(a));

        // ¿ya hay un Folio abierto? Le pasamos los archivos (y lo traemos al frente) y terminamos.
        if (AlreadyRunning())
        {
            string t = File.Exists(tokenFile) ? File.ReadAllText(tokenFile).Trim() : "";
            foreach (string d in docs) Post("__open?t=" + Uri.EscapeDataString(t) + "&path=" + Uri.EscapeDataString(d));
            Post("__front?t=" + Uri.EscapeDataString(t));
            return;
        }

        token = Guid.NewGuid().ToString("N");
        File.WriteAllText(tokenFile, token);
        LoadApp();
        foreach (string d in docs) Enqueue(d);

        TcpListener listener;
        try { listener = new TcpListener(IPAddress.Loopback, PORT); listener.Start(); }
        catch (Exception e)
        {
            MessageBox.Show("No se pudo iniciar DM Studio · PDF: el puerto " + PORT + " está ocupado.\n\n" + e.Message, "DM Studio · PDF", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }
        // The listener is ready; subsequent launches can safely hand files to it.
        Thread server = new Thread(() => Serve(listener)); server.IsBackground = true; server.Start();
        releaseStartup();

        bool ok = false;
        try { PrepareWebView2(); ok = RunWindow(); }
        catch (Exception e) { Debug.WriteLine(e); }
        if (!ok) RunInBrowser(); // sin WebView2: ventana de aplicación de Edge o Chrome
        try { listener.Stop(); } catch { }
    }

    // ---------- WebView2: las DLL van dentro del .exe y se extraen la primera vez ----------
    static string binDir;
    static void PrepareWebView2()
    {
        binDir = Path.Combine(DATA, "bin", WV2);
        Directory.CreateDirectory(binDir);
        foreach (string n in new[] { "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll" })
        {
            string p = Path.Combine(binDir, n);
            using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(n))
            {
                if (File.Exists(p) && new FileInfo(p).Length == s.Length) continue;
                using (FileStream fs = File.Create(p)) s.CopyTo(fs);
            }
        }
        SetDllDirectory(binDir);
        AppDomain.CurrentDomain.AssemblyResolve += (o, e) =>
        {
            string n = new AssemblyName(e.Name).Name + ".dll", p = Path.Combine(binDir, n);
            return File.Exists(p) ? Assembly.LoadFrom(p) : null;
        };
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    static bool RunWindow()
    {
        string ver = null;
        try { ver = Microsoft.Web.WebView2.Core.CoreWebView2Environment.GetAvailableBrowserVersionString(); } catch { }
        if (string.IsNullOrEmpty(ver)) return false;
        AppWindow w = new AppWindow(); window = w;
        Application.Run(w);
        return true;
    }

    // ---------- plan B: Edge/Chrome en modo aplicación ----------
    static string Profile { get { return Path.Combine(DATA, "Perfil"); } }
    static void RunInBrowser()
    {
        string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] candidates = {
            Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"), Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"), Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"), Path.Combine(local, @"Google\Chrome\Application\chrome.exe")
        };
        foreach (string exe in candidates)
        {
            if (!File.Exists(exe)) continue;
            ProcessStartInfo si = new ProcessStartInfo(exe, "--app=" + URL + " --user-data-dir=\"" + Profile + "\" --no-first-run --no-default-browser-check --window-size=1440,920");
            si.UseShellExecute = false;
            try
            {
                Process p = Process.Start(si); p.WaitForExit(); Thread.Sleep(2500);
                for (int i = 0; i < 43200 && ProfileInUse(); i++) Thread.Sleep(1000);
                return;
            }
            catch { }
        }
        try { Process.Start(URL); } catch { }
        MessageBox.Show("DM Studio · PDF está abierto en tu navegador.\nPulsa Aceptar cuando termines para cerrarlo.", "DM Studio · PDF");
    }
    static bool ProfileInUse()
    {
        string lockFile = Path.Combine(Profile, "lockfile");
        if (!File.Exists(lockFile)) return false;
        try { using (File.Open(lockFile, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) { } return false; }
        catch { return true; }
    }

    static void LoadApp()
    {
        using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("app.zip"))
        using (ZipArchive z = new ZipArchive(s, ZipArchiveMode.Read))
            foreach (ZipArchiveEntry e in z.Entries)
            {
                if (e.FullName.EndsWith("/")) continue;
                using (Stream es = e.Open()) using (MemoryStream ms = new MemoryStream()) { es.CopyTo(ms); files["/" + e.FullName.Replace('\\', '/')] = ms.ToArray(); }
            }
    }

    static void Enqueue(string path)
    {
        lock (gate) { string id = (nextId++).ToString(); queued[id] = path; pending.Add(id); }
    }

    static bool AlreadyRunning()
    {
        try
        {
            HttpWebRequest r = (HttpWebRequest)WebRequest.Create(URL + "__folio"); r.Timeout = 1500; r.Proxy = null;
            using (WebResponse resp = r.GetResponse()) using (StreamReader sr = new StreamReader(resp.GetResponseStream())) return sr.ReadToEnd().Trim() == "folio-exe";
        }
        catch { return false; }
    }
    static void Post(string path)
    {
        try { HttpWebRequest r = (HttpWebRequest)WebRequest.Create(URL + path); r.Method = "POST"; r.ContentLength = 0; r.Proxy = null; r.Timeout = 3000; r.GetResponse().Close(); } catch { }
    }

    // ---------- servidor HTTP mínimo (solo 127.0.0.1) ----------
    static void Serve(TcpListener l)
    {
        while (true)
        {
            TcpClient c;
            try { c = l.AcceptTcpClient(); } catch { return; }
            ThreadPool.QueueUserWorkItem(o => Handle((TcpClient)o), c);
        }
    }

    static void Handle(TcpClient c)
    {
        using (c)
        {
            try
            {
                c.ReceiveTimeout = 15000;
                NetworkStream ns = c.GetStream();
                string head = ReadHead(ns); if (head == null) return;
                string[] lines = head.Split(new[] { "\r\n" }, StringSplitOptions.None);
                string[] rl = lines[0].Split(' '); if (rl.Length < 2) return;
                string method = rl[0], target = rl[1], path = target, query = "";
                int q = target.IndexOf('?'); if (q >= 0) { path = target.Substring(0, q); query = target.Substring(q + 1); }
                path = Uri.UnescapeDataString(path);
                string host = "";
                foreach (string h in lines) if (h.StartsWith("Host:", StringComparison.OrdinalIgnoreCase)) host = h.Substring(5).Trim();
                if (host != "127.0.0.1:" + PORT && host != "localhost:" + PORT) { Send(ns, 403, "text/plain", Encoding.UTF8.GetBytes("no"), method); return; }

                if (path == "/__folio") { Send(ns, 200, "text/plain", Encoding.UTF8.GetBytes("folio-exe"), method); return; }
                if ((path == "/__open" || path == "/__front") && method == "POST")
                {
                    Dictionary<string, string> p = Query(query);
                    string t, f;
                    bool auth = p.TryGetValue("t", out t) && t == token;
                    if (auth && path == "/__open" && p.TryGetValue("path", out f) && File.Exists(f)) Enqueue(f);
                    if (auth) BringToFront();
                    Send(ns, auth ? 200 : 403, "text/plain", Encoding.UTF8.GetBytes(auth ? "ok" : "no"), method);
                    return;
                }
                if (path == "/__log" && method == "POST")
                {
                    int len = 0;
                    foreach (string h in lines) if (h.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)) int.TryParse(h.Substring(15).Trim(), out len);
                    len = Math.Min(len, 65536);
                    byte[] body = new byte[len]; int got = 0;
                    while (got < len) { int k = ns.Read(body, got, len - got); if (k <= 0) break; got += k; }
                    try
                    {
                        string logFile = Path.Combine(DATA, "registro.txt");
                        if (File.Exists(logFile) && new FileInfo(logFile).Length > 1000000) File.Delete(logFile);
                        lock (gate) File.AppendAllText(logFile, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + Encoding.UTF8.GetString(body, 0, got) + Environment.NewLine);
                    }
                    catch { }
                    Send(ns, 200, "text/plain", Encoding.UTF8.GetBytes("ok"), method); return;
                }
                if (path.StartsWith("/__dialog/") || path == "/__write")
                {
                    string key = "";
                    foreach (string h in lines) if (h.StartsWith("X-Folio-Key:", StringComparison.OrdinalIgnoreCase)) key = h.Substring(12).Trim();
                    if (method != "POST" || key != pageKey) { Send(ns, 403, "text/plain", Encoding.UTF8.GetBytes("no"), method); return; }
                    Dictionary<string, string> p = Query(query);
                    if (path == "/__dialog/save") { Send(ns, 200, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes(SaveDialog(p)), method); return; }
                    if (path == "/__dialog/folder") { Send(ns, 200, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes(FolderDialog(p)), method); return; }
                    // /__write: guarda el cuerpo de la petición en una ruta elegida antes en un diálogo
                    string target2; p.TryGetValue("path", out target2);
                    string full = string.IsNullOrEmpty(target2) ? null : Path.GetFullPath(target2);
                    bool ok;
                    lock (gate) ok = full != null && (allowedFiles.Contains(full) || allowedDirs.Contains(Path.GetDirectoryName(full)));
                    if (!ok) { Send(ns, 403, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes("Ruta no autorizada"), method); return; }
                    if (p.ContainsKey("unique")) full = FreeName(full);
                    long len = 0;
                    foreach (string h in lines) if (h.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)) long.TryParse(h.Substring(15).Trim(), out len);
                    try
                    {
                        string tmp = full + ".folio-tmp";
                        using (FileStream fs = File.Create(tmp))
                        {
                            byte[] buf = new byte[81920]; long left = len;
                            while (left > 0) { int k = ns.Read(buf, 0, (int)Math.Min(buf.Length, left)); if (k <= 0) break; fs.Write(buf, 0, k); left -= k; }
                            if (left > 0) throw new IOException("La transferencia se cortó");
                        }
                        if (File.Exists(full)) File.Delete(full);
                        File.Move(tmp, full);
                        Send(ns, 200, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes(full), method);
                    }
                    catch (Exception ex) { Send(ns, 500, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes(ex.Message), method); }
                    return;
                }
                if (path == "/__pending")
                {
                    StringBuilder sb = new StringBuilder("[");
                    lock (gate)
                    {
                        for (int i = 0; i < pending.Count; i++)
                        {
                            if (i > 0) sb.Append(',');
                            sb.Append("{\"id\":\"").Append(pending[i]).Append("\",\"name\":\"").Append(Json(Path.GetFileName(queued[pending[i]]))).Append("\"}");
                        }
                        pending.Clear();
                    }
                    sb.Append("]");
                    Send(ns, 200, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(sb.ToString()), method); return;
                }
                if (path == "/__file")
                {
                    string id, f = null; Dictionary<string, string> p = Query(query);
                    lock (gate) { if (p.TryGetValue("id", out id) && queued.TryGetValue(id, out f)) queued.Remove(id); }
                    if (f != null && File.Exists(f)) { Send(ns, 200, "application/octet-stream", File.ReadAllBytes(f), method); return; }
                    Send(ns, 404, "text/plain", Encoding.UTF8.GetBytes("no"), method); return;
                }

                if (path == "/") path = "/index.html";
                byte[] data;
                if (files.TryGetValue(path, out data)) Send(ns, 200, Mime(path), data, method);
                else Send(ns, 404, "text/plain", Encoding.UTF8.GetBytes("No encontrado"), method);
            }
            catch { }
        }
    }

    // ---------- diálogos de Windows (en el hilo de la ventana) ----------
    static readonly string lastDirFile = Path.Combine(DATA, "ultima-carpeta.txt");
    static string LastDir()
    {
        try { string d = File.ReadAllText(lastDirFile).Trim(); if (Directory.Exists(d)) return d; } catch { }
        return Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
    }
    static T OnUI<T>(Func<T> f)
    {
        Form w = window;
        if (w == null || !w.IsHandleCreated) return default(T);
        return (T)w.Invoke(f);
    }
    static string SaveDialog(Dictionary<string, string> p)
    {
        string name, ext, desc;
        p.TryGetValue("name", out name); p.TryGetValue("ext", out ext); p.TryGetValue("desc", out desc);
        ext = string.IsNullOrEmpty(ext) ? "pdf" : ext.Trim('.').ToLowerInvariant();
        string result = OnUI(() =>
        {
            using (SaveFileDialog d = new SaveFileDialog())
            {
                d.Title = "Guardar como";
                d.Filter = (string.IsNullOrEmpty(desc) ? ext.ToUpperInvariant() : desc) + " (*." + ext + ")|*." + ext + "|Todos los archivos (*.*)|*.*";
                d.DefaultExt = ext; d.AddExtension = true; d.OverwritePrompt = true;
                d.InitialDirectory = LastDir();
                d.FileName = string.IsNullOrEmpty(name) ? "documento." + ext : name;
                return d.ShowDialog(window) == DialogResult.OK ? d.FileName : "";
            }
        });
        if (string.IsNullOrEmpty(result)) return "";
        result = Path.GetFullPath(result);
        lock (gate) allowedFiles.Add(result);
        try { File.WriteAllText(lastDirFile, Path.GetDirectoryName(result)); } catch { }
        return result;
    }
    static string FolderDialog(Dictionary<string, string> p)
    {
        string title; p.TryGetValue("title", out title);
        string result = OnUI(() =>
        {
            using (FolderBrowserDialog d = new FolderBrowserDialog())
            {
                d.Description = string.IsNullOrEmpty(title) ? "Elige la carpeta donde guardar" : title;
                d.SelectedPath = LastDir(); d.ShowNewFolderButton = true;
                return d.ShowDialog(window) == DialogResult.OK ? d.SelectedPath : "";
            }
        });
        if (string.IsNullOrEmpty(result)) return "";
        result = Path.GetFullPath(result).TrimEnd('\\');
        lock (gate) allowedDirs.Add(result);
        try { File.WriteAllText(lastDirFile, result); } catch { }
        return result;
    }
    static string FreeName(string full)
    {
        if (!File.Exists(full)) return full;
        string dir = Path.GetDirectoryName(full), stem = Path.GetFileNameWithoutExtension(full), ext = Path.GetExtension(full);
        for (int i = 2; i < 1000; i++) { string c = Path.Combine(dir, stem + " (" + i + ")" + ext); if (!File.Exists(c)) return c; }
        return Path.Combine(dir, stem + " (" + DateTime.Now.Ticks + ")" + ext);
    }

    static void BringToFront()
    {
        Form w = window; if (w == null) return;
        try
        {
            w.BeginInvoke((MethodInvoker)delegate
            {
                if (w.WindowState == FormWindowState.Minimized) w.WindowState = FormWindowState.Normal;
                w.TopMost = true; w.TopMost = false; w.Activate();
            });
        }
        catch { }
    }

    static string ReadHead(NetworkStream ns)
    {
        MemoryStream ms = new MemoryStream(); int b, n = 0;
        while ((b = ns.ReadByte()) >= 0)
        {
            ms.WriteByte((byte)b);
            n = (b == '\r' || b == '\n') ? n + 1 : 0;
            if (n == 4) break;
            if (ms.Length > 65536) return null;
        }
        return ms.Length == 0 ? null : Encoding.ASCII.GetString(ms.ToArray()).TrimEnd();
    }

    static void Send(NetworkStream ns, int code, string type, byte[] body, string method)
    {
        string status = code == 200 ? "OK" : code == 404 ? "Not Found" : code == 500 ? "Internal Server Error" : "Forbidden";
        string h = "HTTP/1.1 " + code + " " + status + "\r\nContent-Type: " + type + "\r\nContent-Length: " + body.Length +
                   "\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n";
        byte[] hb = Encoding.ASCII.GetBytes(h);
        ns.Write(hb, 0, hb.Length);
        if (method != "HEAD") ns.Write(body, 0, body.Length);
        ns.Flush();
    }

    static Dictionary<string, string> Query(string q)
    {
        Dictionary<string, string> d = new Dictionary<string, string>();
        foreach (string kv in q.Split('&'))
        {
            int i = kv.IndexOf('='); if (i < 0) continue;
            d[Uri.UnescapeDataString(kv.Substring(0, i).Replace('+', ' '))] = Uri.UnescapeDataString(kv.Substring(i + 1).Replace('+', ' '));
        }
        return d;
    }

    static string Json(string s)
    {
        StringBuilder sb = new StringBuilder();
        foreach (char ch in s)
        {
            if (ch == '"' || ch == '\\') sb.Append('\\').Append(ch);
            else if (ch < 32) sb.Append("\\u").Append(((int)ch).ToString("x4"));
            else sb.Append(ch);
        }
        return sb.ToString();
    }

    static string Mime(string p)
    {
        switch (Path.GetExtension(p).ToLowerInvariant())
        {
            case ".html": case ".htm": return "text/html; charset=utf-8";
            case ".js": case ".mjs": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json": return "application/json";
            case ".wasm": return "application/wasm";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".ttf": return "font/ttf";
            case ".otf": return "font/otf";
            case ".woff2": return "font/woff2";
            case ".dic": case ".aff": case ".txt": return "text/plain; charset=utf-8";
            case ".gz": return "application/gzip";
            case ".ico": return "image/x-icon";
            default: return "application/octet-stream";
        }
    }
}

// ---------- la ventana del programa ----------
class AppWindow : Form
{
    readonly Microsoft.Web.WebView2.WinForms.WebView2 web;
    readonly string boundsFile = Path.Combine(FolioPDF.DATA, "ventana.txt");

    public AppWindow()
    {
        Text = "DM Studio · PDF";
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        BackColor = Color.FromArgb(27, 27, 31);
        StartPosition = FormStartPosition.Manual;
        Rectangle wa = Screen.PrimaryScreen.WorkingArea;
        Bounds = new Rectangle(wa.X + wa.Width / 2 - 720, wa.Y + wa.Height / 2 - 460, Math.Min(1440, wa.Width), Math.Min(920, wa.Height));
        bool max = true;
        try
        {
            string[] v = File.ReadAllText(boundsFile).Split(',');
            Rectangle r = new Rectangle(int.Parse(v[0]), int.Parse(v[1]), int.Parse(v[2]), int.Parse(v[3]));
            foreach (Screen s in Screen.AllScreens) if (s.WorkingArea.IntersectsWith(r)) { Bounds = r; break; }
            max = v.Length > 4 && v[4] == "1";
        }
        catch { }
        if (max) WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(760, 520);

        web = new Microsoft.Web.WebView2.WinForms.WebView2();
        web.Dock = DockStyle.Fill;
        web.DefaultBackgroundColor = Color.FromArgb(27, 27, 31);
        Controls.Add(web);
        Load += OnLoad;
        FormClosing += (s, e) =>
        {
            try
            {
                Rectangle r = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
                File.WriteAllText(boundsFile, r.X + "," + r.Y + "," + r.Width + "," + r.Height + "," + (WindowState == FormWindowState.Maximized ? "1" : "0"));
            }
            catch { }
        };
    }

    async void OnLoad(object sender, EventArgs e)
    {
        try
        {
            var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(null, Path.Combine(FolioPDF.DATA, "WebView2"));
            await web.EnsureCoreWebView2Async(env);
            var c = web.CoreWebView2;
            c.Settings.AreDevToolsEnabled = false;
            c.Settings.IsStatusBarEnabled = false;
            c.Settings.IsZoomControlEnabled = false;        // Ctrl+rueda lo usa Folio para el zoom del PDF
            c.Settings.AreBrowserAcceleratorKeysEnabled = false; // Ctrl+F, Ctrl+P, Ctrl+S… los maneja Folio
            c.Settings.IsGeneralAutofillEnabled = false;
            c.Settings.IsPasswordAutosaveEnabled = false;
            c.DocumentTitleChanged += (s, a) => { string t = c.DocumentTitle; Text = string.IsNullOrEmpty(t) ? "DM Studio · PDF" : t; };
            // enlaces externos: en el navegador de siempre, nunca dentro de Folio
            c.NewWindowRequested += (s, a) => { a.Handled = true; OpenExternal(a.Uri); };
            c.NavigationStarting += (s, a) =>
            {
                if (!a.Uri.StartsWith(FolioPDF.URL) && !a.Uri.StartsWith("about:") && !a.Uri.StartsWith("blob:") && !a.Uri.StartsWith("data:")) { a.Cancel = true; OpenExternal(a.Uri); }
            };
            // la app es local: portapapeles y archivos sí; cámara, micrófono y ubicación no
            c.PermissionRequested += (s, a) =>
            {
                string k = a.PermissionKind.ToString();
                a.State = (k == "Camera" || k == "Microphone" || k == "Geolocation") ? Microsoft.Web.WebView2.Core.CoreWebView2PermissionState.Deny : Microsoft.Web.WebView2.Core.CoreWebView2PermissionState.Allow;
            };
            // la ventana recibe la clave para pedir diálogos y guardar archivos
            await c.AddScriptToExecuteOnDocumentCreatedAsync("window.__folioHost = Object.freeze({ key: '" + FolioPDF.pageKey + "' });");
            c.Navigate(FolioPDF.URL);
        }
        catch (Exception ex)
        {
            MessageBox.Show("No se pudo abrir la ventana de DM Studio · PDF:\n" + ex.Message, "DM Studio · PDF", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    static void OpenExternal(string uri)
    {
        if (uri != null && (uri.StartsWith("http://") || uri.StartsWith("https://") || uri.StartsWith("mailto:")))
            try { Process.Start(uri); } catch { }
    }
}
