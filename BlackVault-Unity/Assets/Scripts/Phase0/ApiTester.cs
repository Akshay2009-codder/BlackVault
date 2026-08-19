// ApiTester.cs  —  BlackVault Phase 0
// =====================================
//
// PURPOSE
// -------
// Prove that Unity can talk to the FastAPI backend over HTTP.
// This is deliberately NOT wired into any game systems yet — it is a
// standalone proof-of-concept. Attach this to any empty GameObject in
// an empty scene, hit Play, and check the Console window.
//
// SETUP
// -----
//   1. Create an empty GameObject in your scene (e.g. "ApiTester").
//   2. Attach this script to it.
//   3. Make sure your FastAPI backend is running:
//          cd BlackVault/backend
//          uvicorn main:app --reload --port 8000
//   4. Press Play. Watch the Console for "[BlackVault] ..." log lines.
//
// WHAT IT TESTS
// -------------
//   - GET  /ping              -> server alive?
//   - GET  /mission/generate  -> can Unity receive a mission config JSON?
//   - POST /preprocess        -> can Unity POST JSON and receive dataset stats?
//   - POST /train             -> can Unity trigger ML training and get pass/fail?
//
// Once this proves out, the SAME pattern (UnityWebRequest + coroutine +
// JsonUtility) is what every game terminal will use later — just with
// richer request/response classes.
//
// HOW TO READ THE OUTPUT
// ----------------------
//   [BlackVault][PASS]  — test succeeded
//   [BlackVault][FAIL]  — test failed (check the error message)
//   [BlackVault][INFO]  — diagnostic / raw response data

using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

public class ApiTester : MonoBehaviour
{
    // ── Inspector fields ────────────────────────────────────────────────────
    [Header("Backend URL")]
    [Tooltip("Base URL of the FastAPI server. No trailing slash.")]
    public string baseUrl = "http://127.0.0.1:8000";

    [Header("Test Options")]
    [Tooltip("Run all four HTTP tests when the scene starts.")]
    public bool runOnStart = true;

    // ── Unity lifecycle ─────────────────────────────────────────────────────
    void Start()
    {
        if (runOnStart)
        {
            StartCoroutine(RunAllTests());
        }
    }

    // ── Public trigger (also callable from a UI Button) ─────────────────────
    public void RunTests() => StartCoroutine(RunAllTests());

    // ════════════════════════════════════════════════════════════════════════
    // Test orchestration
    // ════════════════════════════════════════════════════════════════════════

    IEnumerator RunAllTests()
    {
        Log("INFO", "─────────────────────────────────────────");
        Log("INFO", "  BlackVault Phase 0  –  API Connectivity Test");
        Log("INFO", $"  Target: {baseUrl}");
        Log("INFO", "─────────────────────────────────────────");

        // 1. Ping — proves the server is alive
        yield return StartCoroutine(TestPing());

        // 2. Mission generate — proves Unity can receive a mission config
        yield return StartCoroutine(TestMissionGenerate());

        // 3. Preprocess — proves Unity can POST and receive dataset stats
        yield return StartCoroutine(TestPreprocess());

        // 4. Train — proves the full ML pipeline round-trip works
        yield return StartCoroutine(TestTrain());

        Log("INFO", "─────────────────────────────────────────");
        Log("INFO", "  All tests complete. See PASS/FAIL above.");
        Log("INFO", "─────────────────────────────────────────");
    }

    // ════════════════════════════════════════════════════════════════════════
    // Test 1 — GET /ping
    // ════════════════════════════════════════════════════════════════════════

    IEnumerator TestPing()
    {
        Log("INFO", "[Test 1/4] GET /ping");

        using var req = UnityWebRequest.Get($"{baseUrl}/ping");
        req.timeout = 5;
        yield return req.SendWebRequest();

        if (req.result != UnityWebRequest.Result.Success)
        {
            Log("FAIL", $"GET /ping failed: {req.error}");
            Log("FAIL", "  Is the backend running?  (uvicorn main:app --reload --port 8000)");
            yield break;
        }

        var resp = JsonUtility.FromJson<PingResponse>(req.downloadHandler.text);
        Log("INFO", $"  status  = {resp.status}");
        Log("INFO", $"  message = {resp.message}");
        Log("INFO", $"  version = {resp.version}");

        if (resp.status == "online")
            Log("PASS", "GET /ping — server is online.");
        else
            Log("FAIL", $"GET /ping — unexpected status: '{resp.status}'");
    }

    // ════════════════════════════════════════════════════════════════════════
    // Test 2 — GET /mission/generate
    // ════════════════════════════════════════════════════════════════════════

    IEnumerator TestMissionGenerate()
    {
        Log("INFO", "[Test 2/4] GET /mission/generate?level=2");

        using var req = UnityWebRequest.Get($"{baseUrl}/mission/generate?level=2");
        req.timeout = 5;
        yield return req.SendWebRequest();

        if (req.result != UnityWebRequest.Result.Success)
        {
            Log("FAIL", $"GET /mission/generate failed: {req.error}");
            yield break;
        }

        // Unity's JsonUtility requires a concrete class — log the raw JSON and
        // parse the fields we care about manually for Phase 0.
        string json = req.downloadHandler.text;
        Log("INFO", $"  Raw JSON (first 300 chars): {json.Substring(0, Mathf.Min(json.Length, 300))}");

        // Basic sanity: response must contain "mission_id"
        if (json.Contains("mission_id"))
            Log("PASS", "GET /mission/generate — received valid mission JSON.");
        else
            Log("FAIL", "GET /mission/generate — 'mission_id' not found in response.");
    }

    // ════════════════════════════════════════════════════════════════════════
    // Test 3 — POST /preprocess
    // ════════════════════════════════════════════════════════════════════════

    IEnumerator TestPreprocess()
    {
        Log("INFO", "[Test 3/4] POST /preprocess");

        // Build the request body — exactly what a game terminal will send.
        var body = new PreprocessRequest
        {
            dataset            = "house_prices",
            missing_strategy   = "fill_median",
            remove_duplicates  = true,
            outlier_strategy   = "clip_iqr",
            encoding           = "label",
            scaling            = "standard",
        };
        string json = JsonUtility.ToJson(body);

        using var req = new UnityWebRequest($"{baseUrl}/preprocess", "POST");
        req.uploadHandler   = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");
        req.timeout = 10;
        yield return req.SendWebRequest();

        if (req.result != UnityWebRequest.Result.Success)
        {
            Log("FAIL", $"POST /preprocess failed: {req.error}");
            Log("FAIL", $"  Body: {req.downloadHandler.text}");
            yield break;
        }

        var resp = JsonUtility.FromJson<PreprocessResponse>(req.downloadHandler.text);
        Log("INFO", $"  rows_before  = {resp.rows_before}");
        Log("INFO", $"  rows_after   = {resp.rows_after}");
        Log("INFO", $"  missing_before = {resp.missing_before}");
        Log("INFO", $"  missing_after  = {resp.missing_after}");

        if (resp.rows_after > 0)
            Log("PASS", "POST /preprocess — dataset cleaned successfully.");
        else
            Log("FAIL", "POST /preprocess — rows_after is 0 (something went wrong).");
    }

    // ════════════════════════════════════════════════════════════════════════
    // Test 4 — POST /train
    // ════════════════════════════════════════════════════════════════════════

    IEnumerator TestTrain()
    {
        Log("INFO", "[Test 4/4] POST /train  (regression, random_forest, house_prices)");

        var body = new TrainRequest
        {
            dataset              = "house_prices",
            problem_type         = "regression",
            algorithm            = "random_forest",
            target_col           = "price",
            target_metric        = "rmse",
            target_metric_value  = 30000f,
            metric_direction     = "lower_is_better",
            missing_strategy     = "fill_median",
            remove_duplicates    = true,
            outlier_strategy     = "clip_iqr",
            scaling              = "standard",
        };
        string json = JsonUtility.ToJson(body);

        using var req = new UnityWebRequest($"{baseUrl}/train", "POST");
        req.uploadHandler   = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");
        req.timeout = 30;   // ML training can take a few seconds
        yield return req.SendWebRequest();

        if (req.result != UnityWebRequest.Result.Success)
        {
            Log("FAIL", $"POST /train failed: {req.error}");
            Log("FAIL", $"  Body: {req.downloadHandler.text}");
            yield break;
        }

        var resp = JsonUtility.FromJson<TrainResponse>(req.downloadHandler.text);
        Log("INFO", $"  target_metric = {resp.target_metric}");
        Log("INFO", $"  target_value  = {resp.target_value}");
        Log("INFO", $"  achieved      = {resp.achieved}");
        Log("INFO", $"  passed        = {resp.passed}");
        Log("INFO", $"  door_status   = {resp.door_status}");

        // Phase 0 counts as a pass just if we got a valid response back.
        // In the real game, 'resp.passed' decides whether the door unlocks.
        if (resp.door_status == "UNLOCKED" || resp.door_status == "LOCKED")
            Log("PASS", "POST /train — ML pipeline round-trip complete.");
        else
            Log("FAIL", "POST /train — unexpected door_status in response.");
    }

    // ════════════════════════════════════════════════════════════════════════
    // Logging helper  (all output is prefixed so it stands out in the Console)
    // ════════════════════════════════════════════════════════════════════════

    static void Log(string level, string message)
    {
        string prefix = $"[BlackVault][{level}]";
        switch (level)
        {
            case "PASS": Debug.Log($"<color=lime>{prefix}</color> {message}"); break;
            case "FAIL": Debug.LogError($"{prefix} {message}"); break;
            default:     Debug.Log($"{prefix} {message}"); break;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // JSON request / response classes
    // ════════════════════════════════════════════════════════════════════════
    // JsonUtility requires [Serializable] plain classes — no Dictionary support.
    // For the game terminals we will use Newtonsoft.Json (available in Unity
    // via Package Manager) which handles nested objects and lists. Phase 0 uses
    // the simpler JsonUtility to prove the transport layer first.

    [Serializable]
    class PingResponse
    {
        public string status;
        public string message;
        public string version;
    }

    [Serializable]
    class PreprocessRequest
    {
        public string dataset;
        public string missing_strategy;
        public bool   remove_duplicates;
        public string outlier_strategy;
        public string encoding;
        public string scaling;
    }

    [Serializable]
    class PreprocessResponse
    {
        public string dataset;
        public int    rows_before;
        public int    rows_after;
        public int    missing_before;
        public int    missing_after;
        public int    duplicates_removed;
    }

    [Serializable]
    class TrainRequest
    {
        public string dataset;
        public string problem_type;
        public string algorithm;
        public string target_col;
        public string target_metric;
        public float  target_metric_value;
        public string metric_direction;
        public string missing_strategy;
        public bool   remove_duplicates;
        public string outlier_strategy;
        public string scaling;
    }

    [Serializable]
    class TrainResponse
    {
        public string target_metric;
        public float  target_value;
        public float  achieved;
        public bool   passed;
        public string door_status;
    }
}
