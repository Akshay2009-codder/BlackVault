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

    public string currentErrorHint = "";
    public List<int> errorLines = new List<int>();

    // PyCharm Darcula Palette
    private const string ColorKeyword  = "#CC7832"; // PyCharm Orange
    private const string ColorComment  = "#7A7E85"; // PyCharm Muted Gray
    private const string ColorString   = "#6A8759"; // PyCharm Green String
    private const string ColorNumber   = "#6897BB"; // PyCharm Cyan/Blue Number
    private const string ColorBuiltin  = "#FFC66D"; // PyCharm Gold Function/Builtin
    private const string ColorError    = "#FF5252"; // PyCharm Red Error Squiggly

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

    private static readonly string[] BlockKeywords =
    {
        "def", "if", "elif", "else", "for", "while", "class", "try", "except", "finally", "with"
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

            // BUGFIX: Keep inputField textComponent 100% transparent when overlayText is active
            // to prevent "one text on another" double-text overlapping artifact.
            if (inputField != null && inputField.textComponent != null)
            {
                Color c = inputField.textComponent.color;
                if (c.a != 0f)
                {
                    c.a = 0f;
                    inputField.textComponent.color = c;
                }
            }
        }
        else if (inputField != null && inputField.textComponent != null)
        {
            Color c = inputField.textComponent.color;
            if (c.a == 0f)
            {
                c.a = 1f;
                inputField.textComponent.color = c;
            }
        }

        // Hide placeholder graphic to ensure zero text overlap
        if (inputField != null && inputField.placeholder != null)
        {
            inputField.placeholder.gameObject.SetActive(string.IsNullOrEmpty(code));
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
            bool hasError = errorLines.Contains(i);
            if (hasError)
            {
                sb.AppendLine($"<color={ColorError}><b>{i}</b></color>");
            }
            else
            {
                sb.AppendLine(i.ToString());
            }
        }
        lineNumbersText.text = sb.ToString();
    }

    private string Highlight(string code)
    {
        if (string.IsNullOrEmpty(code))
        {
            currentErrorHint = "";
            errorLines.Clear();
            return "";
        }

        // Fast newline normalization
        code = code.Replace("\r\n", "\n").Replace('\r', '\n');
        currentErrorHint = "";
        errorLines.Clear();

        List<string> tokens = new List<string>();

        // 1. Comments (# to end of line)
        code = Regex.Replace(code, @"(#.*)$", m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorComment}>{m.Value}</color>");
            return token;
        }, RegexOptions.Multiline);

        // 2. Syntax Check & Error Squiggly: Invalid C-style Operators (&&, ||, !)
        code = Regex.Replace(code, @"(&&|\|\||!(?!=))", m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorError}><u>{m.Value}</u></color>");
            if (string.IsNullOrEmpty(currentErrorHint))
            {
                currentErrorHint = $"SyntaxError: Use Python logical operators 'and', 'or', 'not' instead of '{m.Value}'";
            }
            return token;
        });

        // 3. Strings (double or single quotes)
        code = Regex.Replace(code, @"("".*?""|'.*?')", m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorString}>{m.Value}</color>");
            return token;
        }, RegexOptions.Singleline);

        // Fast line scan for missing colons and unclosed strings
        string[] lines = code.Split('\n');
        for (int l = 0; l < lines.Length; l++)
        {
            string line = lines[l];
            string lineTrimmed = line.Trim();

            // Unclosed string check
            int singleQuotes = 0;
            int doubleQuotes = 0;
            for (int c = 0; c < line.Length; c++)
            {
                if (line[c] == '\'' && (c == 0 || line[c - 1] != '\\')) singleQuotes++;
                if (line[c] == '"' && (c == 0 || line[c - 1] != '\\')) doubleQuotes++;
            }
            if (singleQuotes % 2 != 0 || doubleQuotes % 2 != 0)
            {
                errorLines.Add(l + 1);
                if (string.IsNullOrEmpty(currentErrorHint))
                {
                    currentErrorHint = $"PyCharm Suggestion: Unclosed string literal on line {l + 1}";
                }
            }

            // Missing colon check on block keywords (only if line starts with block keyword and doesn't end with :)
            if (!string.IsNullOrEmpty(lineTrimmed) && !lineTrimmed.StartsWith("#"))
            {
                foreach (string blockKw in BlockKeywords)
                {
                    if (Regex.IsMatch(lineTrimmed, $@"^\s*\b{blockKw}\b") && !lineTrimmed.EndsWith(":") && !lineTrimmed.EndsWith(@"\"))
                    {
                        errorLines.Add(l + 1);
                        if (string.IsNullOrEmpty(currentErrorHint))
                        {
                            currentErrorHint = $"PyCharm Suggestion: Expected ':' at end of line {l + 1}";
                        }
                        break;
                    }
                }
            }
        }

        // 4. Numbers
        code = Regex.Replace(code, @"\b(\d+\.?\d*)\b", m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorNumber}>{m.Value}</color>");
            return token;
        });

        // 5. Keywords
        string kwRegex = $@"\b({string.Join("|", Keywords)})\b";
        code = Regex.Replace(code, kwRegex, m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorKeyword}>{m.Value}</color>");
            return token;
        });

        // 6. Builtins / Functions
        string builtinRegex = $@"\b({string.Join("|", Builtins)})\b";
        code = Regex.Replace(code, builtinRegex, m =>
        {
            string token = ((char)(0xE000 + tokens.Count)).ToString();
            tokens.Add($"<color={ColorBuiltin}>{m.Value}</color>");
            return token;
        });

        // Substitute placeholders back (clean, fast token replacement)
        for (int i = 0; i < tokens.Count; i++)
        {
            string token = ((char)(0xE000 + i)).ToString();
            code = code.Replace(token, tokens[i]);
        }

        return code;
    }
}