// PythonHighlighter.cs — BlackVault
//
// Lightweight Python syntax highlighting for the code editor. Colors
// keywords/strings/comments/numbers by wrapping them in Unity rich-text
// <color> tags and displaying that in an overlay Text sitting on top of
// an invisible-text InputField — the input field itself still handles
// typing/caret/selection, the overlay just shows a colored version of
// the same string.
//
// KNOWN LIMITATION: this uses simple sequential regex passes, not a real
// tokenizer, so a keyword-looking substring INSIDE a string or comment
// can occasionally get colored too (e.g. a comment that says "return
// early" might color "return" even though it's just a comment). This is
// a cosmetic edge case, not a functional bug — good enough for a student
// project code editor, not meant to be a production IDE.
//
// FALLBACK: if this ever misbehaves, set `enableHighlighting = false` in
// the Inspector — the overlay will just show the code in one plain color
// instead of trying to colorize it, no more debugging required.

using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.UI;

public class PythonHighlighter : MonoBehaviour
{
    public InputField inputField;
    public Text overlayText;

    [Tooltip("Turn off to show plain (uncolored) text in the overlay if highlighting ever misbehaves.")]
    public bool enableHighlighting = true;

    private static readonly string[] Keywords =
    {
        "def", "return", "if", "elif", "else", "for", "while", "in", "import",
        "from", "as", "class", "try", "except", "finally", "with", "pass",
        "break", "continue", "and", "or", "not", "is", "None", "True", "False", "lambda",
    };

    private void Start()
    {
        if (inputField == null || overlayText == null) return;
        inputField.onValueChanged.AddListener(OnCodeChanged);
        OnCodeChanged(inputField.text);
    }

    private void OnCodeChanged(string code)
    {
        overlayText.text = enableHighlighting ? Highlight(code) : code;
    }

    private string Highlight(string code)
    {
        // Escape rich-text-breaking characters first (e.g. a `<` in `x < 5`).
        code = code.Replace("<", "&lt;").Replace(">", "&gt;");

        // Comments (from # to end of line)
        code = Regex.Replace(code, @"(#.*)$", "<color=#6A9955>$1</color>", RegexOptions.Multiline);

        // Strings (single or double quoted)
        code = Regex.Replace(code, "(\"[^\"\\n]*\"|'[^'\\n]*')", "<color=#CE9178>$1</color>");

        // Numbers
        code = Regex.Replace(code, @"\b(\d+\.?\d*)\b", "<color=#B5CEA8>$1</color>");

        // Keywords
        foreach (string kw in Keywords)
        {
            code = Regex.Replace(code, $@"\b{kw}\b", $"<color=#C586C0>{kw}</color>");
        }

        return code;
    }
}