/**
 * CodeEditor — Interactive Python code editor with:
 *  - Syntax highlighting (keywords, functions, strings, comments)
 *  - Line numbers
 *  - Explanation panel showing what each line should do
 *  - Starter code templates per door type
 *  - Run / validate before submit
 */

// ── Syntax highlight rules ──
const PYTHON_KEYWORDS = ['import','as','from','def','class','return','if','else','elif',
    'for','while','in','and','or','not','is','None','True','False','with','try','except',
    'finally','raise','pass','break','continue','lambda','print'];

const PY_FUNCS = ['dropna','fillna','drop_duplicates','astype','fit','predict','fit_predict',
    'transform','score','shape','head','tail','describe','info','reset_index','groupby',
    'merge','concat','apply','map','value_counts','isna','notna','replace','rename',
    'set_index','sort_values','corr','mean','std','sum','min','max','len','range','zip',
    'enumerate','type','str','int','float','list','dict','set','pd','np','DataFrame',
    'Series','LinearRegression','RandomForestClassifier','KMeans','IsolationForest',
    'LogisticRegression','DecisionTreeClassifier','StandardScaler','MinMaxScaler',
    'train_test_split','accuracy_score','f1_score','silhouette_score','r2_score'];

// ── Starter code templates per door ──
const STARTER_CODE = {
    cleaning: `import pandas as pd

# Load the dataset (already provided)
df = dataset.copy()

# Step 1: Check for missing values
print("Missing values:", df.isnull().sum())

# Step 2: Remove duplicate rows
df = df.drop_duplicates()

# Step 3: Fix missing numeric values using mean
df['age']    = df['age'].fillna(df['age'].mean())
df['salary'] = df['salary'].fillna(df['salary'].mean())

# Step 4: Fix bad data types (convert to correct type)
df['age']    = df['age'].astype(float)
df['salary'] = df['salary'].astype(float)

# Step 5: Remove outliers (salary > 500000 is extreme)
df = df[df['salary'] <= 500000]

# Done — return cleaned dataset
result = df`,

    regression: `import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

# Prepare features and target
X = dataset[['sqft','bedrooms','bathrooms','age_years','garage']]
y = dataset['price']

# Remove rows with missing values
X = X.dropna()
y = y[X.index]

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model — try RandomForest for best results
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
predictions = model.predict(X_test)
score = r2_score(y_test, predictions)
print(f"R² Score: {score:.4f}")
result = score`,

    classification: `import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score
from sklearn.preprocessing import LabelEncoder

# Prepare features and labels
X = dataset[['feature_1','feature_2','feature_3','feature_4']]
y = dataset['label']

# Encode labels
le = LabelEncoder()
y = le.fit_transform(y)

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train classifier
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
predictions = model.predict(X_test)
score = f1_score(y_test, predictions, average='weighted')
print(f"F1 Score: {score:.4f}")
result = score`,

    clustering: `import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

# Prepare features
X = dataset[['x','y','intensity']]

# Normalize features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Apply KMeans clustering
# Try different k values to find the best silhouette score
k = 3  # TODO: change this to the best number of clusters

model = KMeans(n_clusters=k, random_state=42, n_init=10)
labels = model.fit_predict(X_scaled)

# Evaluate clustering quality
score = silhouette_score(X_scaled, labels)
print(f"Silhouette Score: {score:.4f}")
result = score`,

    anomaly: `import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Prepare features
X = dataset[['amount','time_hour','frequency']]

# Normalize features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Detect anomalies using Isolation Forest
model = IsolationForest(
    contamination=0.1,   # expect ~10% anomalies
    random_state=42
)
predictions = model.fit_predict(X_scaled)

# -1 = anomaly, 1 = normal
anomalies = (predictions == -1)
n_detected = anomalies.sum()
print(f"Detected {n_detected} anomalous transactions")
result = predictions`,
};

// ── Line-by-line explanations per door ──
const LINE_EXPLANATIONS = {
    cleaning: {
        0:  'Import pandas library for data manipulation',
        2:  'Make a copy of the dataset to work with',
        4:  'Check how many values are missing in each column',
        6:  'Remove exact duplicate rows from the dataset',
        8:  'Fill missing ages with the average age value',
        9:  'Fill missing salaries with the average salary',
        11: 'Convert age column to float (numeric) type',
        12: 'Convert salary column to float (numeric) type',
        14: 'Filter out extreme salary outliers (> 500k)',
        16: 'Return the cleaned and validated dataset',
    },
    regression: {
        0:  'Import pandas, sklearn regression models, and metrics',
        5:  'Select the feature columns for prediction',
        6:  'Set the target variable (house price)',
        8:  'Drop rows with missing feature values',
        9:  'Align target with filtered features',
        11: 'Split into 80% training, 20% test data',
        15: 'Create a Random Forest with 100 decision trees',
        16: 'Train the model on the training data',
        18: 'Make predictions on unseen test data',
        19: 'Compute R² score (1.0 = perfect prediction)',
    },
    classification: {
        0:  'Import classification models and metrics',
        4:  'Select the 4 feature columns',
        5:  'Select the target label column',
        7:  'Encode text labels to numbers (spam=1, not_spam=0)',
        8:  'Apply the encoder transformation',
        10: 'Split: 80% train, 20% test',
        14: 'Create Random Forest classifier (100 trees)',
        15: 'Train on labeled training data',
        17: 'Predict classes for unseen test data',
        18: 'F1 score balances precision and recall (0–1)',
    },
    clustering: {
        0:  'Import KMeans clustering and silhouette evaluation',
        4:  'Select x, y, intensity columns as features',
        7:  'Scale features to zero mean and unit variance',
        8:  'Apply StandardScaler transformation',
        11: 'Set number of clusters k (try 2–6)',
        13: 'Create KMeans with k clusters',
        14: 'Fit model and assign cluster labels',
        16: 'Silhouette score: closer to 1.0 = better clusters',
    },
    anomaly: {
        0:  'Import Isolation Forest anomaly detector',
        4:  'Select transaction feature columns',
        7:  'Scale all features to the same range',
        8:  'Apply normalization',
        11: 'Isolation Forest isolates anomalies efficiently',
        12: 'contamination = expected fraction of anomalies',
        14: 'Fit and predict: -1 means anomaly, 1 means normal',
        17: 'Count how many anomalies were detected',
    },
};

export class CodeEditor {
    constructor(doorType, onCodeChange) {
        this.doorType = doorType;
        this.onCodeChange = onCodeChange;
        this.code = STARTER_CODE[doorType] || STARTER_CODE.cleaning;
        this.lines = this.code.split('\n');
        this.activeLine = 0;
        this.explanations = LINE_EXPLANATIONS[doorType] || {};
    }

    getHTML() {
        return `
        <div class="code-editor-wrap">
            <div class="code-editor-toolbar">
                <span class="code-lang-badge">🐍 Python</span>
                <span class="code-door-label">${this._doorLabel()}</span>
                <button class="code-run-btn" id="code-run-btn">▶ RUN</button>
            </div>
            <div class="code-editor-main">
                <div class="code-numbers" id="code-numbers"></div>
                <textarea
                    id="code-textarea"
                    class="code-textarea"
                    spellcheck="false"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                >${this._escapeHtml(this.code)}</textarea>
                <div class="code-highlight" id="code-highlight" aria-hidden="true"></div>
            </div>
            <div class="code-explanation-bar" id="code-explanation">
                <span class="exp-icon">💡</span>
                <span class="exp-text" id="exp-text">Click any line to see what it does</span>
            </div>
            <div class="code-output" id="code-output" style="display:none">
                <div class="code-output-header">OUTPUT</div>
                <div class="code-output-content" id="code-output-content"></div>
            </div>
        </div>`;
    }

    mount() {
        const textarea  = document.getElementById('code-textarea');
        const highlight = document.getElementById('code-highlight');
        const numbers   = document.getElementById('code-numbers');
        const runBtn    = document.getElementById('code-run-btn');
        const expText   = document.getElementById('exp-text');

        if (!textarea) return;

        const updateAll = () => {
            this.code  = textarea.value;
            this.lines = this.code.split('\n');
            this._renderHighlight(highlight);
            this._renderNumbers(numbers);
            if (this.onCodeChange) this.onCodeChange(this.code);

            // Sync scroll
            highlight.scrollTop  = textarea.scrollTop;
            highlight.scrollLeft = textarea.scrollLeft;
        };

        textarea.addEventListener('input',  updateAll);
        textarea.addEventListener('scroll', () => {
            highlight.scrollTop  = textarea.scrollTop;
            highlight.scrollLeft = textarea.scrollLeft;
            numbers.scrollTop    = textarea.scrollTop;
        });

        // Line explanation on click/keyup
        const updateExplanation = () => {
            const cursorPos = textarea.selectionStart;
            const textBefore = textarea.value.substring(0, cursorPos);
            const lineNum = textBefore.split('\n').length - 1;
            this.activeLine = lineNum;
            const exp = this.explanations[lineNum];
            if (expText) {
                expText.textContent = exp
                    ? `Line ${lineNum + 1}: ${exp}`
                    : `Line ${lineNum + 1} — write your Python code here`;
            }
        };

        textarea.addEventListener('click',  updateExplanation);
        textarea.addEventListener('keyup',  updateExplanation);

        // Tab key support
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const s = textarea.selectionStart;
                const v = textarea.value;
                textarea.value = v.substring(0, s) + '    ' + v.substring(s);
                textarea.selectionStart = textarea.selectionEnd = s + 4;
                updateAll();
            }
        });

        // Run button
        if (runBtn) {
            runBtn.addEventListener('click', () => this._runCode());
        }

        // Initial render
        updateAll();
    }

    _renderHighlight(el) {
        if (!el) return;
        const highlighted = this.lines.map(line => this._highlightLine(line)).join('\n');
        el.innerHTML = highlighted + '\n';
    }

    _renderNumbers(el) {
        if (!el) return;
        el.innerHTML = this.lines.map((_, i) =>
            `<div class="ln">${i + 1}</div>`
        ).join('');
    }

    _highlightLine(line) {
        // Escape HTML first
        let safe = this._escapeHtml(line);

        // Comments (must go first)
        safe = safe.replace(/(#.*)$/, '<span class="hl-cmt">$1</span>');

        // Strings (single and double quoted)
        safe = safe.replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, '<span class="hl-str">$1</span>');

        // Numbers
        safe = safe.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-num">$1</span>');

        // Python keywords (only if not already in a span)
        PYTHON_KEYWORDS.forEach(kw => {
            const re = new RegExp(`\\b(${kw})\\b(?![^<]*>)`, 'g');
            safe = safe.replace(re, '<span class="hl-kw">$1</span>');
        });

        // Built-in & sklearn functions
        PY_FUNCS.forEach(fn => {
            const re = new RegExp(`\\b(${fn})\\b(?![^<]*>)`, 'g');
            safe = safe.replace(re, '<span class="hl-fn">$1</span>');
        });

        return `<div class="hl-line">${safe}</div>`;
    }

    _runCode() {
        const output = document.getElementById('code-output');
        const content = document.getElementById('code-output-content');
        if (!output || !content) return;

        output.style.display = 'block';
        content.innerHTML = '';

        // Parse code for key operations
        const lines = this.code.split('\n');
        const ops = this._detectOperations(this.code);

        const log = (msg, cls = '') => {
            const p = document.createElement('div');
            p.className = `out-line ${cls}`;
            p.textContent = msg;
            content.appendChild(p);
        };

        log('> Running code validation...', 'out-sys');

        if (ops.length === 0) {
            log('⚠ No recognised ML operations detected. Add pandas/sklearn calls.', 'out-warn');
        } else {
            ops.forEach(op => log(`✓ Detected: ${op}`, 'out-ok'));
            log(`> Found ${lines.filter(l => l.trim() && !l.trim().startsWith('#')).length} executable lines`, 'out-sys');
            log('> Code looks valid — click SUBMIT to evaluate against the dataset!', 'out-ok');
        }
    }

    _detectOperations(code) {
        const ops = [];
        const checks = [
            [/dropna|drop_duplicates/, 'Remove missing/duplicate rows'],
            [/fillna/,                 'Fill missing values'],
            [/astype/,                 'Fix data types'],
            [/IsolationForest/,        'Isolation Forest anomaly detection'],
            [/LocalOutlierFactor/,     'Local Outlier Factor detection'],
            [/KMeans/,                 'K-Means clustering'],
            [/DBSCAN/,                 'DBSCAN clustering'],
            [/AgglomerativeClustering/,'Agglomerative clustering'],
            [/RandomForest/,           'Random Forest model'],
            [/LinearRegression/,       'Linear Regression model'],
            [/LogisticRegression/,     'Logistic Regression model'],
            [/DecisionTree/,           'Decision Tree model'],
            [/silhouette_score/,       'Silhouette score evaluation'],
            [/r2_score/,               'R² score evaluation'],
            [/f1_score/,               'F1 score evaluation'],
            [/StandardScaler|MinMaxScaler/, 'Feature scaling/normalization'],
            [/train_test_split/,       'Train/test data split'],
            [/fit_predict|\.fit\(|\.predict\(/, 'Model training & prediction'],
        ];
        checks.forEach(([re, label]) => { if (re.test(code)) ops.push(label); });
        return ops;
    }

    getCode() { return this.code; }

    _doorLabel() {
        const labels = {
            cleaning:       '🧹 Data Cleaning',
            regression:     '📈 Regression',
            classification: '🏷️ Classification',
            clustering:     '🔮 Clustering',
            anomaly:        '🔍 Anomaly Detection',
        };
        return labels[this.doorType] || this.doorType;
    }

    _escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
