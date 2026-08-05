using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections.Generic;

namespace BlackVault.Networking
{
    [Serializable]
    public class PreprocessRequest
    {
        public string dataset;
        public string missing_strategy = "fill_median";
        public bool remove_duplicates = true;
        public string outlier_strategy = "clip_iqr";
        public string encoding = "label";
        public string scaling = "standard";
    }

    [Serializable]
    public class PreprocessResponse
    {
        public string dataset;
        public int rows_before;
        public int rows_after;
        public int missing_before;
        public int missing_after;
        public int duplicates_removed;
    }

    [Serializable]
    public class TrainRequest
    {
        public string dataset;
        public string problem_type;
        public string algorithm;
        public string target_col;
        public List<string> feature_cols = null;
        public string target_metric = "accuracy";
        public float target_metric_value = 0.75f;
        public string metric_direction = "higher_is_better";
        public int k = 5;
        
        // Preprocessing fields included
        public string missing_strategy = "fill_median";
        public bool remove_duplicates = true;
        public string outlier_strategy = "clip_iqr";
        public string scaling = "standard";
    }

    [Serializable]
    public class TrainResponse
    {
        public string target_metric;
        public float target_value;
        public float achieved;
        public bool passed;
        public string door_status;
        public int xp_earned;
        public string detail;
    }
    
    [Serializable]
    public class PlayerProgressResponse
    {
        public string player_id;
        public int xp;
        public int level_reached;
        public int total_attempts;
        public int total_passes;
        public string rank;
    }

    [Serializable]
    public class CorruptRequest
    {
        public string dataset;
        public string event_type;
        public string target_col = "target";
    }

    [Serializable]
    public class CorruptResponse
    {
        public string dataset;
        public string event_type;
        public int rows_after;
        public int missing_after;
        public string status;
    }

    [Serializable]
    public class Achievement
    {
        public string id;
        public string name;
        public string description;
        public int xp_reward;
        public bool is_secret;
        public bool unlocked;
        public string unlocked_at;
    }

    [Serializable]
    public class AchievementList
    {
        public List<Achievement> achievements;
    }

    public class ApiClient : MonoBehaviour
    {
        public static ApiClient Instance { get; private set; }
        public string baseUrl = "http://localhost:8000";

        void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void SendPreprocessRequest(PreprocessRequest data, Action<PreprocessResponse> onSuccess, Action<string> onError)
        {
            StartCoroutine(PostRequest("/preprocess", JsonUtility.ToJson(data), onSuccess, onError));
        }

        public void SendTrainRequest(TrainRequest data, Action<TrainResponse> onSuccess, Action<string> onError)
        {
            StartCoroutine(PostRequest("/train", JsonUtility.ToJson(data), onSuccess, onError));
        }

        public void SendCorruptRequest(CorruptRequest data, Action<CorruptResponse> onSuccess, Action<string> onError)
        {
            StartCoroutine(PostRequest("/corrupt", JsonUtility.ToJson(data), onSuccess, onError));
        }
        
        public void GetPlayerProgress(Action<PlayerProgressResponse> onSuccess, Action<string> onError)
        {
            StartCoroutine(GetRequest("/player/progress", onSuccess, onError));
        }

        public void GetAchievements(Action<AchievementList> onSuccess, Action<string> onError)
        {
            // FastAPI returns a list, so we might need a small wrapper hack for Unity's JSON utility
            StartCoroutine(GetRequest<AchievementList>("/player/achievements", onSuccess, onError));
        }

        private IEnumerator GetRequest<T>(string endpoint, Action<T> onSuccess, Action<string> onError)
        {
            string url = baseUrl + endpoint;
            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.ConnectionError || request.result == UnityWebRequest.Result.ProtocolError)
                {
                    Debug.LogError($"Error: {request.error}");
                    onError?.Invoke(request.error);
                }
                else
                {
                    T response = JsonUtility.FromJson<T>(request.downloadHandler.text);
                    onSuccess?.Invoke(response);
                }
            }
        }

        private IEnumerator PostRequest<T>(string endpoint, string jsonData, Action<T> onSuccess, Action<string> onError)
        {
            string url = baseUrl + endpoint;
            using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");

                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.ConnectionError || request.result == UnityWebRequest.Result.ProtocolError)
                {
                    Debug.LogError($"Error: {request.error}\nBody: {request.downloadHandler.text}");
                    onError?.Invoke(request.error);
                }
                else
                {
                    Debug.Log($"Response: {request.downloadHandler.text}");
                    T response = JsonUtility.FromJson<T>(request.downloadHandler.text);
                    onSuccess?.Invoke(response);
                }
            }
        }
    }
}
