// CodeEditorField.cs — BlackVault
//
// Combines a TMP_InputField (for actual typing/caret/selection — its
// own text rendering made invisible) with a TextMeshProUGUI overlay
// that shows the syntax-highlighted version of the same text. This is
// the standard technique for "syntax highlighting while editing" in
// Unity, since TMP_InputField itself doesn't support rich-text tags
// being interpreted WHILE a field is actively being edited.
//
// Setup in Unity (do this by hand — auto-generating a full TMP
// InputField hierarchy via script is fragile; use Unity's own menu):
//   1. Right-click in the Hierarchy (inside your code editor panel) ->
//      UI > Input Field - TextMeshPro. This creates the correct nested
//      structure (Viewport > Text Area > Placeholder + Text) for you.
//   2. Set its "Line Type" to "Multi Line Newline" in the Inspector.
//   3. Find the child Text component (Text Area > Text) and set its
//      color's ALPHA to 0 (fully transparent) — the typed characters
//      become invisible, but the caret/selection highlight (a separate
//      rendering layer) stays visible. This is intentional.
//   4. Duplicate that same Text object (Ctrl+D), rename the duplicate
//      "HighlightOverlay", and move it to render BEHIND the original
//      (drag it above the original in the Hierarchy list, since Unity
//      UI renders top-to-bottom in a Canvas — earlier siblings render
//      first / further back). Make sure its RectTransform anchors/
//      offsets are IDENTICAL to the real text's, so highlighted text
//      lines up exactly under the invisible typed text and caret.
//   5. Attach this script to the parent Input Field GameObject, and
//      drag the InputField component and the HighlightOverlay object
//      into the fields below.

using TMPro;
using UnityEngine;

[RequireComponent(typeof(TMP_InputField))]
public class CodeEditorField : MonoBehaviour
{
    [Tooltip("The actual editable field — its own text should be set to alpha=0 in the Inspector.")]
    public TMP_InputField inputField;

    [Tooltip("A separate TextMeshProUGUI rendered behind the input field's text, showing the syntax-highlighted version.")]
    public TextMeshProUGUI highlightOverlay;

    public string Text
    {
        get => inputField != null ? inputField.text : string.Empty;
        set
        {
            if (inputField != null) inputField.text = value;
            RefreshHighlight(value);
        }
    }

    private void Awake()
    {
        if (inputField == null) inputField = GetComponent<TMP_InputField>();
        if (inputField != null)
        {
            inputField.onValueChanged.AddListener(RefreshHighlight);
        }
    }

    private void RefreshHighlight(string rawText)
    {
        if (highlightOverlay == null) return;
        highlightOverlay.text = PythonSyntaxHighlighter.Highlight(rawText);
    }
}