/**
 * Terminal — ML Challenge UI with rich data table, issue highlighting,
 * action details, real-time pipeline preview, timer, and output log.
 */
export class Terminal {
    constructor(state, api, callbacks) {
        this.state = state;
        this.api = api;
        this.callbacks = callbacks;

        this.el = document.getElementById('terminal-overlay');
        this.titleEl = document.getElementById('terminal-title');
        this.timerEl = document.getElementById('terminal-timer');
        this.dataEl = document.getElementById('terminal-data');
        this.actionsEl = document.getElementById('terminal-actions');
        this.outputEl = document.getElementById('terminal-output');
        this.btnSubmit = document.getElementById('btn-submit-challenge');
        this.btnClose = document.getElementById('btn-close-terminal');

        this.selectedActions = [];
        this.challengeData = null;
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.startTime = 0;

        this.btnSubmit.addEventListener('click', () => this._submit());
        this.btnClose.addEventListener('click', () => callbacks.onClose());
    }

    async show(door, state) {
        this.selectedActions = [];
        this.titleEl.innerHTML = `<span class="terminal-door-badge" style="background:${door.color ? '#' + (typeof door.color === 'number' ? door.color.toString(16).padStart(6, '0') : door.color) : 'var(--neon-green)'}"></span> ${door.name.toUpperCase()} TERMINAL`;

        this.outputEl.innerHTML = '';
        this._log('Connecting to BlackVault Secure Subsystem...', 'sys');

        try {
            this.challengeData = await this.api.startChallenge(
                state.currentLevel, door.type
            );
            
            this._renderTerminalUI();
            this._startTimer(this.challengeData.time_limit);
            this._log(`Challenge loaded: Level ${state.currentLevel} ${door.name}`);
            this._log(`Target: ${this.challengeData.target_metric} ≥ ${this.challengeData.target_value}`);

            if (this.challengeData.hints?.length > 0) {
                this.challengeData.hints.forEach(hint => this._log(`Hint: ${hint}`, 'hint'));
            }
        } catch (e) {
            console.error('Error starting challenge:', e);
            this._log(`ERROR: Could not connect to ML evaluation engine: ${e.message}`, 'error');
            this._renderDemoData(door.type);
            this._startTimer(120);
        }

        this.el.classList.add('active');
        this.startTime = Date.now();
    }

    hide() {
        this.el.classList.remove('active');
        this._stopTimer();
    }

    _renderTerminalUI() {
        this._renderIssueSummary();
        this._renderDataset(this.challengeData.dataset, this.challengeData.cell_issues);
        this._renderActions(this.challengeData.available_actions, this.challengeData.action_details);
        this._renderPipeline();
    }

    _renderIssueSummary() {
        const breakdown = this.challengeData.issue_breakdown;
        if (!breakdown) return;

        let banner = document.getElementById('terminal-issue-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'terminal-issue-banner';
            banner.className = 'terminal-issue-banner';
            const body = document.querySelector('.terminal-body');
            body.insertBefore(banner, body.firstChild);
        }

        const counts = breakdown.counts || {};
        banner.innerHTML = `
            <div class="issue-pill issue-total">Total Issues: <strong>${breakdown.total || 0}</strong></div>
            <div class="issue-pill issue-missing">Missing: <strong>${counts.missing || 0}</strong></div>
            <div class="issue-pill issue-duplicate">Duplicates: <strong>${counts.duplicate || 0}</strong></div>
            <div class="issue-pill issue-bad_type">Type Errors: <strong>${counts.bad_type || 0}</strong></div>
            <div class="issue-pill issue-outlier">Outliers: <strong>${counts.outlier || 0}</strong></div>
        `;
    }

    _renderDataset(dataset, cellIssues = []) {
        if (!dataset?.rows?.length) {
            this.dataEl.innerHTML = '<p class="terminal-empty-data">No data available</p>';
            return;
        }

        const headers = dataset.headers || Object.keys(dataset.rows[0]);
        const rows = dataset.rows.slice(0, 100);

        // Build quick lookup for cell issues: `rowIdx_col` -> issueType
        const issueMap = new Map();
        if (cellIssues && Array.isArray(cellIssues)) {
            cellIssues.forEach(issue => {
                issueMap.set(`${issue.row}_${issue.column}`, issue.type);
            });
        }

        let html = '<div class="table-wrapper"><table><thead><tr>';
        html += '<th class="row-num">#</th>';
        headers.forEach(h => { html += `<th>${h}</th>`; });
        html += '</tr></thead><tbody>';

        rows.forEach((row, rowIdx) => {
            html += `<tr><td class="row-num">${rowIdx + 1}</td>`;
            headers.forEach(h => {
                const val = row[h];
                let issueType = issueMap.get(`${rowIdx}_${h}`);
                let cls = '';
                let title = '';

                if (issueType) {
                    cls = `cell-issue issue-${issueType}`;
                    title = `Issue: ${issueType}`;
                } else if (val === null || val === undefined) {
                    cls = 'cell-issue issue-missing';
                    title = 'Missing value (NULL)';
                } else if (typeof val === 'string' && h !== 'name' && h !== 'department' && h !== 'label' && h !== 'transaction_id') {
                    cls = 'cell-issue issue-bad_type';
                    title = 'Invalid data type';
                } else if (h === 'salary' && typeof val === 'number' && val > 500000) {
                    cls = 'cell-issue issue-outlier';
                    title = 'Extreme outlier';
                }

                const displayVal = val === null || val === undefined ? '∅ NULL' : val;
                html += `<td class="${cls}" title="${title}">${displayVal}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        if (dataset.row_count > rows.length) {
            html += `<p class="table-subtext">Showing first ${rows.length} of ${dataset.row_count} rows</p>`;
        }

        this.dataEl.innerHTML = html;
    }

    _renderActions(actions, actionDetails = {}) {
        this.actionsEl.innerHTML = '<div class="actions-header">AVAILABLE ACTIONS</div>';

        if (!actions?.length) return;

        const actionLabels = {
            remove_missing: '🗑️ Remove Missing',
            fill_missing_mean: '📊 Fill Mean',
            fill_missing_mode: '📋 Fill Mode',
            remove_duplicates: '♻️ Remove Duplicates',
            fix_data_types: '🔧 Fix Types',
            remove_outliers: '✂️ Remove Outliers',
            cap_outliers: '📏 Cap Outliers',
            linear_regression: '📈 Linear Regression',
            ridge_regression: '📈 Ridge Regression',
            lasso_regression: '📈 Lasso Regression',
            decision_tree: '🌳 Decision Tree',
            random_forest: '🌲 Random Forest',
            logistic_regression: '📊 Logistic Regression',
            svm: '⚡ SVM',
            knn: '🎯 K-Nearest Neighbors',
            kmeans: '🎯 K-Means',
            dbscan: '🔬 DBSCAN',
            agglomerative: '🔗 Agglomerative',
            set_clusters_2: '#2 Clusters',
            set_clusters_3: '#3 Clusters',
            set_clusters_4: '#4 Clusters',
            set_clusters_5: '#5 Clusters',
            set_clusters_6: '#6 Clusters',
            isolation_forest: '🌲 Isolation Forest',
            local_outlier_factor: '📍 Local Outlier Factor',
            one_class_svm: '⚡ One-Class SVM',
            statistical_threshold: '📐 Statistical Threshold',
            set_threshold_low: '🔽 Low Threshold',
            set_threshold_medium: '➡️ Med Threshold',
            set_threshold_high: '🔼 High Threshold',
            normalize_features: '📏 Normalize',
            balance_classes: '⚖️ Balance Classes',
        };

        const container = document.createElement('div');
        container.className = 'actions-list';

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            if (this.selectedActions.includes(action)) {
                btn.classList.add('selected');
            }

            const label = actionLabels[action] || action;
            const details = actionDetails[action];

            btn.innerHTML = `
                <div class="action-btn-main">
                    <span class="action-label">${label}</span>
                </div>
                ${details?.description ? `<div class="action-desc">${details.description}</div>` : ''}
            `;
            btn.dataset.action = action;

            btn.addEventListener('click', () => {
                if (btn.classList.contains('selected')) {
                    btn.classList.remove('selected');
                    this.selectedActions = this.selectedActions.filter(a => a !== action);
                    this._log(`Removed action: ${label}`, 'warn');
                } else {
                    btn.classList.add('selected');
                    this.selectedActions.push(action);
                    this._log(`Added action: ${label}`, 'success');
                }
                this._renderPipeline();
            });

            container.appendChild(btn);
        });

        this.actionsEl.appendChild(container);
    }

    _renderPipeline() {
        let pipelineEl = document.getElementById('terminal-pipeline');
        if (!pipelineEl) {
            pipelineEl = document.createElement('div');
            pipelineEl.id = 'terminal-pipeline';
            pipelineEl.className = 'terminal-pipeline';
            this.actionsEl.appendChild(pipelineEl);
        }

        if (this.selectedActions.length === 0) {
            pipelineEl.innerHTML = '<span class="pipeline-placeholder">No actions selected in pipeline</span>';
            return;
        }

        pipelineEl.innerHTML = `
            <div class="pipeline-title">PIPELINE (${this.selectedActions.length}):</div>
            <div class="pipeline-tags">
                ${this.selectedActions.map((a, i) => `
                    <span class="pipeline-tag">
                        <span class="pipeline-step">${i + 1}</span>
                        ${a.replace(/_/g, ' ')}
                    </span>
                `).join('')}
            </div>
        `;
    }

    _renderDemoData(doorType) {
        const demoData = {
            headers: ['id', 'name', 'age', 'salary', 'department', 'rating'],
            rows: [
                { id: 1, name: 'Employee_1', age: 28, salary: 65000, department: 'Engineering', rating: 4.2 },
                { id: 2, name: 'Employee_2', age: 'unknown', salary: 72000, department: 'Marketing', rating: 3.8 },
                { id: 3, name: 'Employee_3', age: 35, salary: null, department: 'Sales', rating: 4.5 },
                { id: 3, name: 'Employee_3', age: 35, salary: null, department: 'Sales', rating: 4.5 },
                { id: 4, name: 'Employee_4', age: 44, salary: 2500000, department: 'Finance', rating: 2.1 },
            ],
            row_count: 5,
        };
        this.challengeData = {
            dataset: demoData,
            target_metric: 'cleaning_accuracy',
            target_value: 0.7,
            time_limit: 120,
            available_actions: ['remove_missing', 'fill_missing_mean', 'remove_duplicates', 'fix_data_types', 'remove_outliers', 'cap_outliers'],
            action_details: {},
            issue_breakdown: { total: 4, counts: { missing: 1, duplicate: 1, bad_type: 1, outlier: 1 } },
            hints: ['Demo mode active. Clean the missing, duplicate, and outlier values.'],
        };
        this._renderTerminalUI();
    }

    _startTimer(seconds) {
        this.timeRemaining = seconds;
        this._updateTimerDisplay();

        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this._updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this._stopTimer();
                this._log('TIME LIMIT EXPIRED! Submitting current pipeline...', 'error');
                this._submit();
            }
        }, 1000);
    }

    _stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    _updateTimerDisplay() {
        const mins = Math.max(0, Math.floor(this.timeRemaining / 60));
        const secs = Math.max(0, this.timeRemaining % 60);
        this.timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        this.timerEl.className = 'terminal-timer';
        if (this.timeRemaining <= 15) {
            this.timerEl.classList.add('critical');
        } else if (this.timeRemaining <= 30) {
            this.timerEl.classList.add('warning');
        }
    }

    async _submit() {
        this._stopTimer();
        const timeTaken = (Date.now() - this.startTime) / 1000;

        this._log('Evaluating pipeline on validation server...', 'sys');
        this.btnSubmit.disabled = true;
        this.btnSubmit.textContent = 'EVALUATING...';

        try {
            const result = await this.api.submitChallenge(
                this.state.currentLevel,
                this.state.activeDoor.type,
                this.selectedActions,
                timeTaken
            );

            this.btnSubmit.disabled = false;
            this.btnSubmit.textContent = 'SUBMIT SOLUTION';
            this.callbacks.onComplete(result);
        } catch (e) {
            console.error('Error submitting challenge:', e);
            const demoResult = {
                success: this.selectedActions.length >= 2,
                score: Math.min(1, 0.4 + this.selectedActions.length * 0.2),
                target: 0.7,
                stars: Math.min(3, Math.max(1, this.selectedActions.length - 1)),
                message: this.selectedActions.length >= 2 ? 'Pipeline accepted!' : 'Insufficient cleaning steps.',
                metric_name: 'cleaning_accuracy',
                feedback: this.selectedActions.map(a => ({
                    action: a,
                    status: 'correct',
                    message: `Applied ${a.replace(/_/g, ' ')}`,
                })),
            };
            this.btnSubmit.disabled = false;
            this.btnSubmit.textContent = 'SUBMIT SOLUTION';
            this.callbacks.onComplete(demoResult);
        }
    }

    _log(message, type = 'info') {
        const p = document.createElement('p');
        p.className = `terminal-log log-${type}`;
        const timeStr = new Date().toLocaleTimeString([], { hour12: false });
        p.innerHTML = `<span class="log-time">[${timeStr}]</span> ${message}`;
        this.outputEl.appendChild(p);
        this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }
}
