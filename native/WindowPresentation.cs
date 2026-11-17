using System;
using System.Drawing;
using System.IO;

namespace Baran {
  public static class WindowFrame {
    public const int Edge = 8;
    public static int HitTest(Point point, Size size, bool maximized) {
      if (maximized || point.X < 0 || point.Y < 0 || point.X >= size.Width || point.Y >= size.Height) return 1;
      bool left = point.X < Edge, right = point.X >= size.Width - Edge, top = point.Y < Edge, bottom = point.Y >= size.Height - Edge;
      return top && left ? 13 : top && right ? 14 : bottom && left ? 16 : bottom && right ? 17 : left ? 10 : right ? 11 : top ? 12 : bottom ? 15 : 1;
    }
  }
  public sealed class WindowPlacement {
    readonly string path;
    public Rectangle NormalBounds; public bool Maximized;
    public WindowPlacement(string profile) {
      path = Path.Combine(profile, "window-placement.json");
      try {
        if (!File.Exists(path)) return;
        var state = J.Decode(File.ReadAllText(path));
        int x = checked((int)J.Num(state, "x")), y = checked((int)J.Num(state, "y")), width = checked((int)J.Num(state, "width")), height = checked((int)J.Num(state, "height"));
        if (width < 200 || height < 200 || width > 32000 || height > 32000 || Math.Abs((long)x) > 100000 || Math.Abs((long)y) > 100000) return;
        NormalBounds = new Rectangle(x, y, width, height); Maximized = J.Bool(state, "maximized");
      } catch { NormalBounds = Rectangle.Empty; }
    }
    public static Rectangle Fit(Rectangle saved, Rectangle area) {
      int availableWidth = Math.Max(1, area.Width - 32), availableHeight = Math.Max(1, area.Height - 32);
      int width = Math.Min(availableWidth, Math.Max(Math.Min(720, availableWidth), saved.IsEmpty ? 1000 : saved.Width));
      int height = Math.Min(availableHeight, Math.Max(Math.Min(480, availableHeight), saved.IsEmpty ? 680 : saved.Height));
      int x = saved.IsEmpty ? area.Left + (area.Width-width)/2 : Math.Max(area.Left, Math.Min(saved.Left, area.Right-width));
      int y = saved.IsEmpty ? area.Top + (area.Height-height)/2 : Math.Max(area.Top, Math.Min(saved.Top, area.Bottom-height));
      return new Rectangle(x, y, width, height);
    }
    public void Save(Rectangle normal, bool maximized) {
      if (normal.Width < 200 || normal.Height < 200) return;
      NormalBounds = normal; Maximized = maximized;
      J.Atomic(path, J.Obj("x", normal.X, "y", normal.Y, "width", normal.Width, "height", normal.Height, "maximized", maximized));
    }
  }
  public static class ViewStartup {
    public static Color Background(object settings) { return ColorTranslator.FromHtml(J.Str(settings, "theme") == "light" ? "#eff6ff" : "#070910"); }
    public static string Script(object settings) {
      string theme = J.Str(settings, "theme") == "light" ? "light" : "dark", language = J.Str(settings, "language", "en");
      if (language != "fa" && language != "ja" && language != "ru") language = "en";
      string values = J.Encode(J.Obj("theme", theme, "language", language, "direction", language == "fa" ? "rtl" : "ltr", "background", theme == "light" ? "#eff6ff" : "#070910"));
      return "(()=>{const v=" + values + ";const apply=()=>{const e=document.documentElement;if(!e)return false;e.dataset.theme=v.theme;e.lang=v.language;e.dir=v.direction;e.style.backgroundColor=v.background;return true};if(!apply()){const o=new MutationObserver(()=>{if(apply())o.disconnect()});o.observe(document,{childList:true})}})();";
    }
  }
}
