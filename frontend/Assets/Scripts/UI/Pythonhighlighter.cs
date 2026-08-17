// PythonHighlighter.cs — BlackVault PyCharm Highlighting Engine
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.UI;

public class PythonHighlighter : MonoBehaviour
{
    public InputField inputField;
    public Text overlayText;
    public Text lineNumbersText;

    [Tooltip("Turn off to show plain (uncolored) text in the overlay if highlighting ever misbehaves.")]
    public bool enableHighlighting = true;

    // PyCharm Darcula Palette
    private const string ColorKeyword  = "#CC7832"; // PyCharm Orange
    private const string ColorComment  = "#7A7E85"; // PyCharm Muted Gray
    private const string ColorString   = "#6A8759"; // PyCharm Green String
    private const string ColorNumber   = "#6897BB"; // PyCharm Cyan/Blue Number
    private const string ColorBuiltin  = "#FFC66D"; // PyCharm Gold Function/Builtin

    private static readonly string[] Keywords =
    {
        "def", "return", "if", "elif", "else", "for", "while", "in", "import",
        "from", "as", "class", "try", "except", "finally", "with", "pass",
        "break", "continue", "and", "or", "not", "is", "None", "True", "False",
        "lambda", "yield", "raise", "assert", "global", "nonlocal"
    };

    private static readonly string[] Builtins =
    {
        "df", "pd", "np", "print", "len", "range", "shape", "columns", "values",
        "head", "tail", "drop", "dropna", "fillna", "select_dtypes", "fit",
        "predict", "fit_predict", "train_test_split", "IsolationForest",
        "LogisticRegression", "RandomForestClassifier", "StandardScaler",
        "LabelEncoder", "KMeans", "target_col", "feature_cols", "y_test",
        "y_pred", "labels", "anomaly_flags", "int", "float", "str", "list", "dict"
    };

    private void Start()
    {
        if (inputField == null) return;
        inputField.onValueChanged.AddListener(OnCodeChanged);
        OnCodeChanged(inputField.text);
    }

    public void OnCodeChanged(string code)
    {
        if (code == null) code = "";

        if (overlayText != null)
        {
            overlayText.text = enableHighlighting ? Highlight(code) : code;
        }

        UpdateLineNumbers(code);
    }

    public void UpdateLineNumbers(string code)
    {
        if (lineNumbersText == null) return;

        int lineCount = 1;
        for (int i = 0; i < code.Length; i++)
        {
            if (code[i] == '\n') lineCount++;
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= lineCount; i++)
        {
            sb.AppendLine(i.ToString());
        }
        lineNumbersText.text = sb.ToString();
    }

    private string Highlight(string code)
    {
        if (string.IsNullOrEmpty(code)) return "";

        // Normalize newlines
        code = code.Replace("\r\n", "\n").Replace('\r', '\n');

        // Extract tokens (Comments, Strings, Numbers, Keywords, Builtins)
        // We use placeholders \uE000{index}\uE001 so regex passes don't corrupt hex color tags.
        List<string> tokens = new List<string>();

        // 1. Comments (# to end of line)
        code = Regex.Replace(code, @"(#.*)$", m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorComment}>{m.Value}</color>");
            return token;
        }, RegexOptions.Multiline);

        // 2. Strings (double or single quotes, multiline handling)
        code = Regex.Replace(code, @"("".*?""|'.*?')", m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorString}>{m.Value}</color>");
            return token;
        }, RegexOptions.Singleline);

        // 3. Numbers
        code = Regex.Replace(code, @"\b(\d+\.?\d*)\b", m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorNumber}>{m.Value}</color>");
            return token;
        });

        // 4. Keywords
        string kwRegex = $@"\b({string.Join("|", Keywords)})\b";
        code = Regex.Replace(code, kwRegex, m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorKeyword}>{m.Value}</color>");
            return token;
        });

        // 5. Builtins / Functions
        string builtinRegex = $@"\b({string.Join("|", Builtins)})\b";
        code = Regex.Replace(code, builtinRegex, m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorBuiltin}>{m.Value}</color>");
            return token;
        });

        // Substitute placeholders back
        for (int i = 0; i < tokens.Count; i++)
        {
            string token = ((char)(0xE000 + i)).ToString();
            code = code.Replace(token, tokens[i]);
        }

        return code;
    }
}