// PuzzleCodeView.cs — BlackVault
//
// Renders the current preprocessing pipeline + dataset info as
// syntax-highlighted pseudocode inside a single TextMeshProUGUI,
// using TMP's built-in rich text color tags. No external syntax
// highlighting package needed — this hand-tags the small, known
// vocabulary of tokens BlackVault actually uses (function names,
// booleans, strings, comments), which is simpler and more reliable
// than a generic tokenizer for a fixed set of pipeline steps.
//
// SETUP IN UNITY:
//   1. On Canvas_MLPuzzle, replace (or add alongside) datasetPreviewText
//      with a new TextMeshProUGUI object. Set its Font Asset to a
//      monospace TMP font (Window > TextMeshPro > Font Asset Creator,
//      using a .ttf like JetBrains Mono or Consolas — Unity doesn't
//      ship one by default, so import a free monospace .ttf into
//      Assets/Fonts first, then generate the Font Asset from it).
//   2. Enable "Rich Text" on that TextMeshProUGUI component (on by default).
//   3. Give its parent a background Image with color ~ #1E1E2E (near-black,
//      slight blue tint — the PyCharm Darcula look) and a thin 1px border
//      using a 9-sliced sprite if you have one, or just a solid Image
//      with alpha 0.9 if not.
//   4. Attach this script to that same GameObject (or a parent), drag
//      the TextMeshProUGUI reference in, and call RenderPipeline(...)
//      instead of writing directly to datasetPreviewText.text.
//
// This does NOT replace resultText / statsText — keep those as
// separate, non-overlapping UI elements (see the layout note below).

using System.Collections.Generic;
using System.Text;
using TMPro;
using UnityEngine;

public class PuzzleCodeView : MonoBehaviour
{
    [Header("Target")]
    public TMP_Text codeText;

    // ---- Darcula-inspired palette (hex, no leading '#' needed for TMP tags) ----
    private const string ColKeyword   = "C586C0"; // import, def, if, True/False
    private const string ColFunction  = "DCDCAA"; // .dropna(), .fit(), etc.
    private const string ColString    = "CE9178"; // "house_prices.csv"
    private const string ColNumber    = "B5CEA8"; // numeric literals
    private const string ColComment   = "6A9955"; // # comments
    private const string ColVariable  = "9CDCFE"; // df, model, X_train
    private const string ColDefault   = "D4D4D4"; // plain punctuation/text
    private const string ColClass     = "4EC9B0"; // RandomForestRegressor, etc.

    private static string Tag(string hex, string text) => $"<color=#{hex}>{text}</color>";

    /// <summary>
    /// Renders the current pipeline choices as syntax-highlighted pseudocode.
    /// Call this every time a toggle/dropdown changes, same trigger point
    /// where you currently update statsText.
    /// </summary>
    public void RenderPipeline(
        string datasetFileName,
        bool removeDuplicates,
        bool fillMissing,
        bool encode,
        bool scale,
        string algorithm,
        string targetCol)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"{Tag(ColKeyword, "import")} {Tag(ColVariable, "pandas")} {Tag(ColKeyword, "as")} {Tag(ColVariable, "pd")}");
        sb.AppendLine();
        sb.AppendLine($"{Tag(ColComment, "# loading dataset")}");
        sb.AppendLine($"{Tag(ColVariable, "df")} = {Tag(ColVariable, "pd")}.{Tag(ColFunction, "read_csv")}({Tag(ColString, $"\"{datasetFileName}\"")})");
        sb.AppendLine();

        sb.AppendLine($"{Tag(ColComment, "# preprocessing pipeline")}");

        AppendStep(sb, "df.drop_duplicates(inplace=True)", removeDuplicates);
        AppendStep(sb, "df.fillna(df.median(), inplace=True)", fillMissing);
        AppendStep(sb, "df = pd.get_dummies(df)  # encode categoricals", encode);
        AppendStep(sb, "df = StandardScaler().fit_transform(df)", scale);

        sb.AppendLine();

        if (!string.IsNullOrEmpty(algorithm) && algorithm != "n/a")
        {
            sb.AppendLine($"{Tag(ColComment, "# model")}");
            string targetLine = string.IsNullOrEmpty(targetCol)
                ? ""
                : $"{Tag(ColVariable, "y")} = {Tag(ColVariable, "df")}[{Tag(ColString, $"\"{targetCol}\"")}]\n";
            sb.Append(targetLine);
            sb.AppendLine($"{Tag(ColVariable, "model")} = {Tag(ColClass, PascalCase(algorithm))}()");
            sb.AppendLine($"{Tag(ColVariable, "model")}.{Tag(ColFunction, "fit")}({Tag(ColVariable, "X_train")}, {Tag(ColVariable, "y_train")})");
        }

        codeText.text = sb.ToString();
    }

    private void AppendStep(StringBuilder sb, string line, bool active)
    {
        // Applied steps render in full syntax color; pending steps render
        // dimmed + commented-out, so the player visually sees what their
        // checkbox choices will actually execute — like toggling lines
        // of real code on and off.
        if (active)
        {
            sb.AppendLine(HighlightLine(line));
        }
        else
        {
            sb.AppendLine($"<alpha=#55>{Tag(ColComment, "# " + line + "   (not applied)")}</alpha>");
        }
    }

    private string HighlightLine(string raw)
    {
        // Small fixed set of tokens we know will appear — colored directly
        // rather than a full tokenizer, since the vocabulary is tiny and fixed.
        var replacements = new Dictionary<string, string>
        {
            { "df", Tag(ColVariable, "df") },
            { "inplace=True", Tag(ColKeyword, "inplace") + "=" + Tag(ColKeyword, "True") },
            { "drop_duplicates", Tag(ColFunction, "drop_duplicates") },
            { "fillna", Tag(ColFunction, "fillna") },
            { "median", Tag(ColFunction, "median") },
            { "get_dummies", Tag(ColFunction, "get_dummies") },
            { "pd", Tag(ColVariable, "pd") },
            { "StandardScaler", Tag(ColClass, "StandardScaler") },
            { "fit_transform", Tag(ColFunction, "fit_transform") },
        };

        string result = raw;
        // Comment portion (after '#') gets fully commented out, rest highlighted
        int hashIdx = raw.IndexOf('#');
        string codePart = hashIdx >= 0 ? raw.Substring(0, hashIdx) : raw;
        string commentPart = hashIdx >= 0 ? raw.Substring(hashIdx) : "";

        foreach (var kv in replacements)
            codePart = codePart.Replace(kv.Key, kv.Value);

        if (!string.IsNullOrEmpty(commentPart))
            commentPart = Tag(ColComment, commentPart);

        return codePart + commentPart;
    }

    private string PascalCase(string algoId)
    {
        // "random_forest" -> "RandomForest", "svm" -> "SVM" (kept as-is if short/acronym)
        if (algoId.Length <= 4 && algoId.ToUpper() == algoId) return algoId;
        var parts = algoId.Split('_');
        for (int i = 0; i < parts.Length; i++)
            if (parts[i].Length > 0)
                parts[i] = char.ToUpper(parts[i][0]) + parts[i].Substring(1);
        return string.Join("", parts);
    }
}