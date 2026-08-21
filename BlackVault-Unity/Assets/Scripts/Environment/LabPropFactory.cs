// LabPropFactory.cs — BlackVault
//
// Static factory for spawning decorative lab environment props from
// Unity primitives. All props are built from cubes, cylinders, and
// quads with colored/emissive materials — no imported models needed.
//
// Usage (from LevelBuilder or LabEnvironmentBuilder):
//   var rack = LabPropFactory.CreateServerRack(parent, position, accentColor);

using UnityEngine;

public static class LabPropFactory
{
    // ------------------------------------------------------------------
    // Material helpers
    // ------------------------------------------------------------------

    /// <summary>
    /// Creates a simple opaque material with the given color.
    /// Uses the Standard shader with Metallic workflow.
    /// </summary>
    public static Material CreateMaterial(Color color, float metallic = 0f, float smoothness = 0.3f)
    {
        Material mat = new Material(Shader.Find("Standard"));
        mat.color = color;
        mat.SetFloat("_Metallic", metallic);
        mat.SetFloat("_Glossiness", smoothness);
        return mat;
    }

    /// <summary>
    /// Creates an emissive material that glows the given color.
    /// </summary>
    public static Material CreateEmissiveMaterial(Color color, float intensity = 2f)
    {
        Material mat = new Material(Shader.Find("Standard"));
        mat.color = color;
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", color * intensity);
        mat.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
        return mat;
    }

    // ------------------------------------------------------------------
    // Standard color palette for lab surfaces
    // ------------------------------------------------------------------

    /// <summary>Dark gunmetal gray for walls.</summary>
    public static Color WallColor => new Color(0.15f, 0.16f, 0.18f);

    /// <summary>Slightly lighter gray for floors.</summary>
    public static Color FloorColor => new Color(0.12f, 0.13f, 0.15f);

    /// <summary>Dark ceiling color.</summary>
    public static Color CeilingColor => new Color(0.10f, 0.10f, 0.12f);

    /// <summary>Very dark metallic for props like racks, desks.</summary>
    public static Color PropDarkMetal => new Color(0.08f, 0.08f, 0.10f);

    /// <summary>Medium gray for secondary prop surfaces.</summary>
    public static Color PropMediumGray => new Color(0.22f, 0.23f, 0.26f);

    /// <summary>Subtle trim color for edges and bezels.</summary>
    public static Color TrimColor => new Color(0.30f, 0.32f, 0.35f);

    // ------------------------------------------------------------------
    // Server Rack — tall thin cabinet with blinking accent lights
    // ------------------------------------------------------------------

    /// <summary>
    /// Creates a server rack: a tall dark box with small emissive
    /// accent lights running down the front face.
    /// </summary>
    public static GameObject CreateServerRack(Transform parent, Vector3 localPos,
                                               Color accentColor, float height = 2.8f)
    {
        GameObject root = new GameObject("ServerRack");
        root.transform.SetParent(parent, false);
        root.transform.localPosition = localPos;

        // Main cabinet body
        GameObject body = GameObject.CreatePrimitive(PrimitiveType.Cube);
        body.name = "RackBody";
        body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0f, height / 2f, 0f);
        body.transform.localScale = new Vector3(0.8f, height, 0.6f);
        body.GetComponent<Renderer>().material = CreateMaterial(PropDarkMetal, 0.7f, 0.5f);

        // Front bezel trim
        GameObject bezel = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bezel.name = "RackBezel";
        bezel.transform.SetParent(root.transform, false);
        bezel.transform.localPosition = new Vector3(0f, height / 2f, 0.31f);
        bezel.transform.localScale = new Vector3(0.75f, height - 0.1f, 0.02f);
        bezel.GetComponent<Renderer>().material = CreateMaterial(PropMediumGray, 0.5f, 0.4f);

        // LED accent lights (4 small emissive strips)
        Material ledMat = CreateEmissiveMaterial(accentColor, 3f);
        for (int i = 0; i < 4; i++)
        {
            GameObject led = GameObject.CreatePrimitive(PrimitiveType.Cube);
            led.name = $"LED_{i}";
            led.transform.SetParent(root.transform, false);
            float y = 0.5f + i * (height - 1f) / 3f;
            led.transform.localPosition = new Vector3(0.25f, y, 0.33f);
            led.transform.localScale = new Vector3(0.08f, 0.04f, 0.02f);
            led.GetComponent<Renderer>().material = ledMat;

            // Remove collider from tiny decoration
            Object.DestroyImmediate(led.GetComponent<Collider>());
        }

        // Small point light at center of rack for glow
        GameObject lightObj = new GameObject("RackGlow");
        lightObj.transform.SetParent(root.transform, false);
        lightObj.transform.localPosition = new Vector3(0f, height * 0.6f, 0.4f);
        Light glow = lightObj.AddComponent<Light>();
        glow.type = LightType.Point;
        glow.color = accentColor;
        glow.intensity = 0.6f;
        glow.range = 2f;

        return root;
    }

    // ------------------------------------------------------------------
    // Desk with Monitor
    // ------------------------------------------------------------------

    /// <summary>
    /// Creates a desk: a flat surface with a monitor (angled cube + screen quad).
    /// </summary>
    public static GameObject CreateDesk(Transform parent, Vector3 localPos,
                                         Color screenColor, float yRotation = 0f)
    {
        GameObject root = new GameObject("Desk");
        root.transform.SetParent(parent, false);
        root.transform.localPosition = localPos;
        root.transform.localEulerAngles = new Vector3(0f, yRotation, 0f);

        // Desk surface
        GameObject surface = GameObject.CreatePrimitive(PrimitiveType.Cube);
        surface.name = "DeskSurface";
        surface.transform.SetParent(root.transform, false);
        surface.transform.localPosition = new Vector3(0f, 0.75f, 0f);
        surface.transform.localScale = new Vector3(1.5f, 0.06f, 0.7f);
        surface.GetComponent<Renderer>().material = CreateMaterial(PropMediumGray, 0.3f, 0.4f);

        // Desk legs (4 thin cylinders)
        float legH = 0.72f;
        Vector3[] legOffsets = {
            new Vector3(-0.65f, legH / 2f, -0.28f),
            new Vector3(0.65f, legH / 2f, -0.28f),
            new Vector3(-0.65f, legH / 2f, 0.28f),
            new Vector3(0.65f, legH / 2f, 0.28f)
        };
        foreach (var offset in legOffsets)
        {
            GameObject leg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            leg.name = "Leg";
            leg.transform.SetParent(root.transform, false);
            leg.transform.localPosition = offset;
            leg.transform.localScale = new Vector3(0.05f, legH / 2f, 0.05f);
            leg.GetComponent<Renderer>().material = CreateMaterial(PropDarkMetal, 0.8f, 0.6f);
            Object.DestroyImmediate(leg.GetComponent<Collider>());
        }

        // Monitor stand
        GameObject stand = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        stand.name = "MonitorStand";
        stand.transform.SetParent(root.transform, false);
        stand.transform.localPosition = new Vector3(0f, 0.85f, -0.15f);
        stand.transform.localScale = new Vector3(0.06f, 0.12f, 0.06f);
        stand.GetComponent<Renderer>().material = CreateMaterial(PropDarkMetal, 0.8f, 0.5f);
        Object.DestroyImmediate(stand.GetComponent<Collider>());

        // Monitor housing
        GameObject monitor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        monitor.name = "MonitorBody";
        monitor.transform.SetParent(root.transform, false);
        monitor.transform.localPosition = new Vector3(0f, 1.15f, -0.18f);
        monitor.transform.localScale = new Vector3(0.8f, 0.5f, 0.04f);
        monitor.transform.localEulerAngles = new Vector3(-5f, 0f, 0f);
        monitor.GetComponent<Renderer>().material = CreateMaterial(PropDarkMetal, 0.6f, 0.5f);
        Object.DestroyImmediate(monitor.GetComponent<Collider>());

        // Monitor screen (emissive quad on front)
        GameObject screen = GameObject.CreatePrimitive(PrimitiveType.Quad);
        screen.name = "MonitorScreen";
        screen.transform.SetParent(monitor.transform, false);
        screen.transform.localPosition = new Vector3(0f, 0f, 0.51f);
        screen.transform.localScale = new Vector3(0.9f, 0.85f, 1f);
        screen.GetComponent<Renderer>().material = CreateEmissiveMaterial(screenColor, 1.5f);
        Object.DestroyImmediate(screen.GetComponent<Collider>());

        return root;
    }

    // ------------------------------------------------------------------
    // Wall-mounted Screen
    // ------------------------------------------------------------------

    /// <summary>
    /// Creates a flat wall-mounted display screen with a thin frame.
    /// Attach against a wall surface.
    /// </summary>
    public static GameObject CreateWallScreen(Transform parent, Vector3 localPos,
                                               Color screenColor, float yRotation = 0f,
                                               float width = 1.2f, float height = 0.7f)
    {
        GameObject root = new GameObject("WallScreen");
        root.transform.SetParent(parent, false);
        root.transform.localPosition = localPos;
        root.transform.localEulerAngles = new Vector3(0f, yRotation, 0f);

        // Frame
        GameObject frame = GameObject.CreatePrimitive(PrimitiveType.Cube);
        frame.name = "ScreenFrame";
        frame.transform.SetParent(root.transform, false);
        frame.transform.localPosition = Vector3.zero;
        frame.transform.localScale = new Vector3(width + 0.08f, height + 0.08f, 0.04f);
        frame.GetComponent<Renderer>().material = CreateMaterial(TrimColor, 0.5f, 0.4f);
        Object.DestroyImmediate(frame.GetComponent<Collider>());

        // Screen surface
        GameObject screen = GameObject.CreatePrimitive(PrimitiveType.Quad);
        screen.name = "ScreenSurface";
        screen.transform.SetParent(root.transform, false);
        screen.transform.localPosition = new Vector3(0f, 0f, 0.025f);
        screen.transform.localScale = new Vector3(width, height, 1f);
        screen.GetComponent<Renderer>().material = CreateEmissiveMaterial(screenColor, 1.2f);
        Object.DestroyImmediate(screen.GetComponent<Collider>());

        return root;
    }

    // ------------------------------------------------------------------
    // Floor Marking (hazard stripe / directional)
    // ------------------------------------------------------------------

    /// <summary>
    /// Creates a flat floor marking (quad lying on the floor).
    /// </summary>
    public static GameObject CreateFloorMarking(Transform parent, Vector3 localPos,
                                                 Color color, float width = 2f, float length = 0.15f,
                                                 float yRotation = 0f)
    {
        GameObject marking = GameObject.CreatePrimitive(PrimitiveType.Quad);
        marking.name = "FloorMarking";
        marking.transform.SetParent(parent, false);
        marking.transform.localPosition = localPos + new Vector3(0f, 0.01f, 0f); // just above floor
        marking.transform.localEulerAngles = new Vector3(90f, yRotation, 0f);
        marking.transform.localScale = new Vector3(width, length, 1f);
        marking.GetComponent<Renderer>().material = CreateEmissiveMaterial(color, 0.8f);
        Object.DestroyImmediate(marking.GetComponent<Collider>());
        return marking;
    }

    // ------------------------------------------------------------------
    // Ceiling Light Panel
    // ------------------------------------------------------------------

    /// <summary>
    /// Creates a recessed ceiling light panel (emissive quad flush with ceiling).
    /// Also adds a downward-facing spot/point light.
    /// </summary>
    public static GameObject CreateCeilingLightPanel(Transform parent, Vector3 localPos,
                                                      Color lightColor, float width = 1.5f,
                                                      float length = 0.4f, float intensity = 1.2f)
    {
        GameObject root = new GameObject("CeilingLight");
        root.transform.SetParent(parent, false);
        root.transform.localPosition = localPos;

        // Panel quad (facing down)
        GameObject panel = GameObject.CreatePrimitive(PrimitiveType.Quad);
        panel.name = "LightPanel";
        panel.transform.SetParent(root.transform, false);
        panel.transform.localPosition = Vector3.zero;
        panel.transform.localEulerAngles = new Vector3(-90f, 0f, 0f); // face down
        panel.transform.localScale = new Vector3(width, length, 1f);
        panel.GetComponent<Renderer>().material = CreateEmissiveMaterial(lightColor, 2f);
        Object.DestroyImmediate(panel.GetComponent<Collider>());

        // Actual light source
        GameObject lightObj = new GameObject("LightSource");
        lightObj.transform.SetParent(root.transform, false);
        lightObj.transform.localPosition = new Vector3(0f, -0.1f, 0f);
        Light light = lightObj.AddComponent<Light>();
        light.type = LightType.Point;
        light.color = lightColor;
        light.intensity = intensity;
        light.range = 8f;

        return root;
    }

    // ------------------------------------------------------------------
    // Pipe (wall/ceiling mounted)
    // ------------------------------------------------------------------

    /// <summary>
    /// Creates a cylindrical pipe along one axis.
    /// </summary>
    public static GameObject CreatePipe(Transform parent, Vector3 localPos,
                                         float length, float radius = 0.06f,
                                         Vector3? rotation = null)
    {
        GameObject pipe = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        pipe.name = "Pipe";
        pipe.transform.SetParent(parent, false);
        pipe.transform.localPosition = localPos;
        pipe.transform.localScale = new Vector3(radius * 2f, length / 2f, radius * 2f);
        if (rotation.HasValue)
            pipe.transform.localEulerAngles = rotation.Value;
        pipe.GetComponent<Renderer>().material = CreateMaterial(TrimColor, 0.8f, 0.6f);
        Object.DestroyImmediate(pipe.GetComponent<Collider>());
        return pipe;
    }

    // ------------------------------------------------------------------
    // Railing / Horizontal Bar
    // ------------------------------------------------------------------

    /// <summary>
    /// Creates a horizontal railing (thin stretched cube).
    /// </summary>
    public static GameObject CreateRailing(Transform parent, Vector3 localPos,
                                            float length, float yRotation = 0f)
    {
        GameObject root = new GameObject("Railing");
        root.transform.SetParent(parent, false);
        root.transform.localPosition = localPos;
        root.transform.localEulerAngles = new Vector3(0f, yRotation, 0f);

        // Horizontal bar
        GameObject bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bar.name = "Bar";
        bar.transform.SetParent(root.transform, false);
        bar.transform.localPosition = new Vector3(0f, 1f, 0f);
        bar.transform.localScale = new Vector3(length, 0.05f, 0.05f);
        bar.GetComponent<Renderer>().material = CreateMaterial(TrimColor, 0.8f, 0.5f);

        // Support posts
        int postCount = Mathf.Max(2, Mathf.CeilToInt(length / 1.5f));
        for (int i = 0; i < postCount; i++)
        {
            float t = (postCount == 1) ? 0f : (float)i / (postCount - 1);
            float x = -length / 2f + t * length;
            GameObject post = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            post.name = $"Post_{i}";
            post.transform.SetParent(root.transform, false);
            post.transform.localPosition = new Vector3(x, 0.5f, 0f);
            post.transform.localScale = new Vector3(0.04f, 0.5f, 0.04f);
            post.GetComponent<Renderer>().material = CreateMaterial(TrimColor, 0.8f, 0.5f);
            Object.DestroyImmediate(post.GetComponent<Collider>());
        }

        return root;
    }

    // ------------------------------------------------------------------
    // Access Card Scanner (small box beside a door)
    // ------------------------------------------------------------------

    /// <summary>
    /// Creates a small wall-mounted card reader / scanner box.
    /// </summary>
    public static GameObject CreateCardScanner(Transform parent, Vector3 localPos,
                                                Color ledColor, float yRotation = 0f)
    {
        GameObject root = new GameObject("CardScanner");
        root.transform.SetParent(parent, false);
        root.transform.localPosition = localPos;
        root.transform.localEulerAngles = new Vector3(0f, yRotation, 0f);

        // Scanner housing
        GameObject housing = GameObject.CreatePrimitive(PrimitiveType.Cube);
        housing.name = "ScannerBox";
        housing.transform.SetParent(root.transform, false);
        housing.transform.localPosition = Vector3.zero;
        housing.transform.localScale = new Vector3(0.15f, 0.22f, 0.06f);
        housing.GetComponent<Renderer>().material = CreateMaterial(PropMediumGray, 0.5f, 0.4f);
        Object.DestroyImmediate(housing.GetComponent<Collider>());

        // LED indicator
        GameObject led = GameObject.CreatePrimitive(PrimitiveType.Cube);
        led.name = "ScannerLED";
        led.transform.SetParent(root.transform, false);
        led.transform.localPosition = new Vector3(0f, 0.08f, 0.035f);
        led.transform.localScale = new Vector3(0.06f, 0.02f, 0.01f);
        led.GetComponent<Renderer>().material = CreateEmissiveMaterial(ledColor, 4f);
        Object.DestroyImmediate(led.GetComponent<Collider>());

        // Scan slot
        GameObject slot = GameObject.CreatePrimitive(PrimitiveType.Cube);
        slot.name = "ScanSlot";
        slot.transform.SetParent(root.transform, false);
        slot.transform.localPosition = new Vector3(0f, -0.03f, 0.035f);
        slot.transform.localScale = new Vector3(0.10f, 0.005f, 0.01f);
        slot.GetComponent<Renderer>().material = CreateMaterial(new Color(0.05f, 0.05f, 0.05f), 0.9f, 0.7f);
        Object.DestroyImmediate(slot.GetComponent<Collider>());

        return root;
    }

    // ------------------------------------------------------------------
    // Wall Panel / Tech Panel — decorative wall detail
    // ------------------------------------------------------------------

    /// <summary>
    /// Adds a recessed tech panel (thin inset on a wall) for visual detail.
    /// </summary>
    public static GameObject CreateWallPanel(Transform parent, Vector3 localPos,
                                              float width = 1.5f, float height = 1.0f,
                                              float yRotation = 0f)
    {
        GameObject root = new GameObject("WallPanel");
        root.transform.SetParent(parent, false);
        root.transform.localPosition = localPos;
        root.transform.localEulerAngles = new Vector3(0f, yRotation, 0f);

        // Outer frame
        GameObject frame = GameObject.CreatePrimitive(PrimitiveType.Cube);
        frame.name = "PanelFrame";
        frame.transform.SetParent(root.transform, false);
        frame.transform.localPosition = Vector3.zero;
        frame.transform.localScale = new Vector3(width, height, 0.03f);
        frame.GetComponent<Renderer>().material = CreateMaterial(PropMediumGray, 0.4f, 0.3f);
        Object.DestroyImmediate(frame.GetComponent<Collider>());

        // Inner inset (darker)
        GameObject inset = GameObject.CreatePrimitive(PrimitiveType.Cube);
        inset.name = "PanelInset";
        inset.transform.SetParent(root.transform, false);
        inset.transform.localPosition = new Vector3(0f, 0f, 0.02f);
        inset.transform.localScale = new Vector3(width - 0.1f, height - 0.1f, 0.01f);
        inset.GetComponent<Renderer>().material = CreateMaterial(PropDarkMetal, 0.3f, 0.2f);
        Object.DestroyImmediate(inset.GetComponent<Collider>());

        return root;
    }
}
