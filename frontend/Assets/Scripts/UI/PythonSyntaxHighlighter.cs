// PythonSyntaxHighlighter.cs — BlackVault
//
// A lightweight, regex-based Python syntax highlighter that outputs
// TextMeshPro rich-text (color tags). This is NOT a full tokenizer/
// parser — it's pattern matching good enough for a game's code editor,
// not a real IDE. Order of operations matters: strings and comments are
// highlighted FIRST and their spans protected from further matching, so
// a keyword-looking word inside a string doesn't get colored as a
// keyword.
//
// FIX (v2): placeholder markers now use letters (base-26), not digits.
// The original digit-based markers (\u0001{index}\u0001) were themselves
// matched by NumberRegex during the keyword/number highlighting pass,
// which injected a <color> tag INSIDE the marker and broke the final
// restore step — leaving literal \u0001 characters in the output (seen
// as "unicode \u0001 not found in font" warnings in Unity). Letters
// can't collide with NumberRegex, and the "PH" prefix ensures the
// marker text can never exactly match a keyword or provided-name word.
//
// Usage: PythonSyntaxHighlighter.Highlight(rawCode) -> rich-text string
// Feed the result into a TextMeshProUGUI with richText enabled — see
// CodeEditorField.cs for how this is layered under an invisible
// TMP_InputField to create the actual editable-with-highlighting effect.

using System.Text.RegularExpressions;
using System.Collections.Generic;

public static class PythonSyntaxHighlighter
{
    // Colors chosen for a dark-panel editor background (see MLPuzzleUI's
    // code editor panel, which uses a near-black background).
    private const string ColorKeyword = "#C586C0";   // purple — if/def/return/etc.
    private const string ColorBuiltin = "#4EC9B0";   // teal — provided names (df, pd, np, sklearn classes)
    private const string ColorString = "#CE9178";    // orange — string literals
    private const string ColorComment = "#6A9955";   // green — # comments
    private const string ColorNumber = "#B5CEA8";    // light green — numeric literals
    private const string ColorFunction = "#DCDCAA";  // yellow — function calls (name followed by '(')

    private static readonly string[] Keywords =
    {
        "def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or",
        "import", "from", "as", "class", "try", "except", "finally", "raise", "with",
        "pass", "break", "continue", "lambda", "is", "None", "True", "False", "global",
    };

    // Names the game explicitly provides to player code (see
    // services/code_executor.py's _build_namespace) — highlighted
    // distinctly so the player can visually tell "this is given to me"
    // apart from names they define themselves.
    private static readonly string[] ProvidedNames =
    {
        "df", "target_col", "feature_cols", "pd", "np", "train_test_split",
        "LinearRegression", "DecisionTreeRegressor", "RandomForestRegressor",
        "LogisticRegression", "DecisionTreeClassifier", "RandomForestClassifier",
        "SVC", "KMeans", "DBSCAN", "IsolationForest", "OneClassSVM",
        "StandardScaler", "MinMaxScaler", "LabelEncoder",
        "y_test", "y_pred", "labels", "anomaly_flags",
    };

    private static readonly Regex StringRegex =
        new Regex("(\"\"\".*?\"\"\"|'''.*?'''|\"[^\"\\n]*\"|'[^'\\n]*')", RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex CommentRegex =
        new Regex("#[^\n]*", RegexOptions.Compiled);
    private static readonly Regex NumberRegex =
        new Regex(@"\b\d+\.?\d*\b", RegexOptions.Compiled);
    private static readonly Regex FunctionCallRegex =
        new Regex(@"\b([A-Za-z_][A-Za-z0-9_]*)(?=\()", RegexOptions.Compiled);

    private static readonly Regex KeywordRegex =
        new Regex(@"\b(" + string.Join("|", Keywords) + @")\b", RegexOptions.Compiled);
    private static readonly Regex ProvidedNameRegex =
        new Regex(@"\b(" + string.Join("|", ProvidedNames) + @")\b", RegexOptions.Compiled);

    // Placeholder marker regex/prefix. "PH" prefix + letters-only index
    // guarantees this can never collide with a real keyword, provided
    // name, or number — see fix note above.
    private const string MarkerPrefix = "PH";
    private static readonly Regex RestoreRegex =
        new Regex("\u0001PH([A-Za-z]+)\u0001", RegexOptions.Compiled);

    public static string Highlight(string code)
    {
        if (string.IsNullOrEmpty(code)) return code;

        var placeholders = new List<string>();

        string masked = StringRegex.Replace(code, m =>
        {
            string colored = $"<color={ColorString}>{EscapeForRichText(m.Value)}</color>";
            placeholders.Add(colored);
            return $"\u0001{MarkerPrefix}{ToLetters(placeholders.Count - 1)}\u0001";
        });

        masked = CommentRegex.Replace(masked, m =>
        {
            string colored = $"<color={ColorComment}>{EscapeForRichText(m.Value)}</color>";
            placeholders.Add(colored);
            return $"\u0001{MarkerPrefix}{ToLetters(placeholders.Count - 1)}\u0001";
        });

        // Function calls first (so a keyword like "list" used as list()
        // still gets function-call coloring rather than falling through) —
        // then keywords, then provided names, then numbers. None of these
        // can match inside the \u0001PH...\u0001 markers now.
        masked = FunctionCallRegex.Replace(masked, m => $"<color={ColorFunction}>{m.Value}</color>");
        masked = KeywordRegex.Replace(masked, m => $"<color={ColorKeyword}>{m.Value}</color>");
        masked = ProvidedNameRegex.Replace(masked, m => $"<color={ColorBuiltin}>{m.Value}</color>");
        masked = NumberRegex.Replace(masked, m => $"<color={ColorNumber}>{m.Value}</color>");

        // Restore the protected string/comment placeholders.
        string restored = RestoreRegex.Replace(masked, m =>
            placeholders[FromLetters(m.Groups[1].Value)]);

        return restored;
    }

    private static string EscapeForRichText(string text)
    {
        // TMP rich text uses < > as tag delimiters — escape any that
        // appear literally in player-typed strings/comments so they
        // don't get misinterpreted as (possibly malformed) tags.
        return text.Replace("<", "<\u200B").Replace(">", "\u200B>");
    }

    // Base-26 letter encoding (A, B, ... Z, AA, AB, ...) — used instead
    // of digits so placeholder markers are immune to NumberRegex.
    private static string ToLetters(int index)
    {
        string result = "";
        index += 1; // 1-based so index 0 -> "A", not ""
        while (index > 0)
        {
            int rem = (index - 1) % 26;
            result = (char)('A' + rem) + result;
            index = (index - 1) / 26;
        }
        return result;
    }

    private static int FromLetters(string letters)
    {
        int result = 0;
        foreach (char c in letters)
            result = result * 26 + (c - 'A' + 1);
        return result - 1; // back to 0-based
    }
}