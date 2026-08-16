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
        code = code.Replace("<", "&lt;").Replace(">", "&gt;");

        code = Regex.Replace(code, @"(#.*)$", "<color=#6A9955>$1</color>", RegexOptions.Multiline);

        code = Regex.Replace(code, "(\"[^\"\\n]*\"|'[^'\\n]*')", "<color=#CE9178>$1</color>");

        code = Regex.Replace(code, @"\b(\d+\.?\d*)\b", "<color=#B5CEA8>$1</color>");

        foreach (string kw in Keywords)
        {
            code = Regex.Replace(code, $@"\b{kw}\b", $"<color=#C586C0>{kw}</color>");
        }

        return code;
    }
}