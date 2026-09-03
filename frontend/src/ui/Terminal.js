/**
 * Terminal — ML Challenge UI.
 * Left panel: dataset table with issue highlighting.
 * Right panel: Python code editor (CodeEditor component).
 * Bottom: log console + timer + submit.
 */
import { CodeEditor } from './CodeEditor.js';

export class Terminal {
    constructor(state, api, callbacks) {
        this.state     = state;
        this.api       = api;
        this.callbacks = callbacks;

        this.el           = document.getElementById('terminal-overlay');
        this.containerEl  = document.getElementById('terminal-container');
        this.accentBar    = document.getElementById('terminal-accent-bar');
        this.titleEl      = document.getElementById('terminal-title');
        this.timerEl      = document.getElementById('terminal-timer');
        this.dataEl       = document.getElementById('terminal-data');
        this.editorEl     = document.getElementById('terminal-editor');
        this.outputEl     = document.getElementById('terminal-output');
        this.issueBanner  = document.getElementById('terminal-issue-banner');
        this.footerLeft   = document.getElementById('terminal-footer-left');
        this.btnSubmit    = document.getElementById('btn-submit-challenge');
        this.btnClose     = document.getElementById('btn-close-terminal');

        this.challengeData  = null;
        this.codeEditor     = null;
        this.timerInterval  = null;
        this.timeRemaining  = 0;
        this.startTime      = 0;
        this.currentDoor    = null;

        this.btnSubmit.addEventListener('click', () => this._submit());
        this.btnClose.addEventListener('click',  () => callbacks.onClose());
    }

    async show(door, state) {
        this.currentDoor = door;
        this.outputEl.innerHTML = '';

        const doorColor = this._doorColor(door);
        this._applyTheme(doorColor, door.name);

        this._log('Connecting to BlackVault Secure Subsystem...', 'sys');
        this._log(`Loading ${door.name.toUpperCase()} challenge module...`, 'sys');

        try {
            this.challengeData = await this.api.startChallenge(state.currentLevel, door.type);
            this._renderUI();
            this._startTimer(this.challengeData.time_limit);
            this._log(`Challenge ready — Level ${state.currentLevel}`, 'info');
            this._log(`Target: ${this.challengeData.target_metric} ≥ ${(this.challengeData.target_value * 100).toFixed(0)}%`, 'info');
            if (this.challengeData.hints?.length) {
                this.challengeData.hints.forEach(h => this._log(`💡 ${h}`, 'hint'));
            }
        } catch (e) {
            console.error('Challenge load error:', e);
            this._log(`Backend offline — loading demo mode`, 'warn');
            this._loadDemo(door.type);
            this._startTimer(120);
        }

        this.el.classList.add('active');
        this.startTime = Date.now();
    }

    hide() {
        this.el.classList.remove('active');
        this._stopTimer();
        this._resetTheme();
    }

    // ─────────────────────────────────────────────
    //  THEME
    // ─────────────────────────────────────────────

    _doorColor(door) {
        if (typeof door.color === 'number')
            return '#' + door.color.toString(16).padStart(6, '0');
        return door.color?.startsWith?.('#') ? door.color : '#00f0ff';
    }

    _applyTheme(hex, name) {
        if (this.accentBar) {
            this.accentBar.style.background = hex;
            this.accentBar.style.boxShadow  = `0 0 18px ${hex}`;
        }
        if (this.containerEl) {
            this.containerEl.style.borderColor = hex + '55';
            this.containerEl.style.boxShadow   = `0 0 80px ${hex}18`;
        }
        this.titleEl.innerHTML = `<span class="terminal-door-badge" style="background:${hex};box-shadow:0 0 10px ${hex}"></span>${name.toUpperCase()} TERMINAL`;
    }

    _resetTheme() {
        if (this.accentBar) { this.accentBar.style.background = ''; this.accentBar.style.boxShadow = ''; }
        if (this.containerEl) { this.containerEl.style.borderColor = ''; this.containerEl.style.boxShadow = ''; }
    }

    // ─────────────────────────────────────────────
    //  RENDERING
    // ─────────────────────────────────────────────

    _renderUI() {
        this._renderIssueBanner();
        this._renderDataset(this.challengeData.dataset, this.challengeData.cell_issues);
        this._renderCodeEditor();
    }

    _renderIssueBanner() {
        const bd = this.challengeData.issue_breakdown;
        if (!bd || !this.issueBanner) return;
        const c = bd.counts || {};
        this.issueBanner.innerHTML = `
            <div class="issue-pill issue-total">⚠ Total Issues: <strong>${bd.total || 0}</strong></div>
            ${c.missing   > 0 ? `<div class="issue-pill issue-missing">Missing: <strong>${c.missing}</strong></div>`     : ''}
            ${c.duplicate > 0 ? `<div class="issue-pill issue-duplicate">Duplicates: <strong>${c.duplicate}</strong></div>` : ''}
            ${c.bad_type  > 0 ? `<div class="issue-pill issue-bad_type">Type Errors: <strong>${c.bad_type}</strong></div>`   : ''}
            ${c.outlier   > 0 ? `<div class="issue-pill issue-outlier">Outliers: <strong>${c.outlier}</strong></div>`        : ''}
        `;
        this.issueBanner.style.display = 'flex';
    }

    _renderDataset(dataset, cellIssues = []) {
        if (!dataset?.rows?.length) {
            this.dataEl.innerHTML = '<p class="terminal-empty-data">No data available</p>';
            return;
        }

        const headers  = dataset.headers || Object.keys(dataset.rows[0]);
        const rows     = dataset.rows.slice(0, 80);
        const issueMap = new Map();

        (cellIssues || []).forEach(ci => issueMap.set(`${ci.row}_${ci.column}`, ci.type));

        let html = '<div class="table-wrapper"><table><thead><tr><th class="row-num">#</th>';
        headers.forEach(h => { html += `<th>${h}</th>`; });
        html += '</tr></thead><tbody>';

        rows.forEach((row, ri) => {
            html += `<tr><td class="row-num">${ri + 1}</td>`;
            headers.forEach(h => {
                const val = row[h];
                let issueType = issueMap.get(`${ri}_${h}`);
                let cls = '', title = '';

                if (issueType) {
                    cls = `cell-issue issue-${issueType}`; title = `Issue: ${issueType}`;
                } else if (val === null || val === undefined) {
                    cls = 'cell-issue issue-missing';      title = 'Missing value (NULL)';
                } else if (typeof val === 'string' && !['name','department','label','transaction_id'].includes(h)) {
                    cls = 'cell-issue issue-bad_type';     title = 'Invalid data type';
                } else if (h === 'salary' && typeof val === 'number' && val > 500000) {
                    cls = 'cell-issue issue-outlier';      title = 'Extreme outlier';
                }

                const dv = (val === null || val === undefined) ? '∅ NULL' : val;
                html += `<td class="${cls}" title="${title}">${dv}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        if (dataset.row_count > rows.length)
            html += `<p class="table-subtext">Showing ${rows.length} of ${dataset.row_count} rows</p>`;

        this.dataEl.innerHTML = html;
    }

    _renderCodeEditor() {
        if (!this.editorEl) return;
        this.codeEditor = new CodeEditor(this.currentDoor.type, (code) => {
            if (this.footerLeft)
                this.footerLeft.textContent = `${code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length} lines of code`;
        });
        this.editorEl.innerHTML = this.codeEditor.getHTML();
        this.codeEditor.mount();
    }

    // ─────────────────────────────────────────────
    //  DEMO (offline fallback)
    // ─────────────────────────────────────────────

    _loadDemo(doorType) {
        this.challengeData = {
            dataset: {
                headers: ['id','name','age','salary','department','rating'],
                rows: [
                    { id:1, name:'Employee_1', age:28,        salary:65000,   department:'Engineering', rating:4.2 },
                    { id:2, name:'Employee_2', age:'unknown',  salary:72000,   department:'Marketing',   rating:3.8 },
                    { id:3, name:'Employee_3', age:35,         salary:null,    department:'Sales',       rating:4.5 },
                    { id:3, name:'Employee_3', age:35,         salary:null,    department:'Sales',       rating:4.5 },
                    { id:4, name:'Employee_4', age:44,         salary:2500000, department:'Finance',     rating:2.1 },
                ],
                row_count: 5,
            },
            target_metric: 'cleaning_accuracy',
            target_value: 0.7,
            time_limit: 120,
            issue_breakdown: { total: 4, counts: { missing:1, duplicate:1, bad_type:1, outlier:1 } },
            hints: ['DEMO MODE — Backend offline'],
            cell_issues: [
                { row:1, column:'age',    type:'bad_type'  },
                { row:2, column:'salary', type:'missing'   },
                { row:3, column:'id',     type:'duplicate' },
                { row:4, column:'salary', type:'outlier'   },
            ],
        };
        this._renderUI();
    }

    // ─────────────────────────────────────────────
    //  TIMER
    // ─────────────────────────────────────────────

    _startTimer(seconds) {
        this.timeRemaining = seconds;
        this._updateTimer();
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this._updateTimer();
            if (this.timeRemaining <= 0) { this._stopTimer(); this._submit(); }
        }, 1000);
    }

    _stopTimer() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }

    _updateTimer() {
        const m = Math.max(0, Math.floor(this.timeRemaining / 60));
        const s = Math.max(0, this.timeRemaining % 60);
        this.timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        this.timerEl.className = 'terminal-timer';
        if      (this.timeRemaining <= 15) this.timerEl.classList.add('critical');
        else if (this.timeRemaining <= 30) this.timerEl.classList.add('warning');
    }

    // ─────────────────────────────────────────────
    //  SUBMIT
    // ─────────────────────────────────────────────

    async _submit() {
        this._stopTimer();
        const timeTaken = (Date.now() - this.startTime) / 1000;
        const code = this.codeEditor?.getCode() || '';

        this._log('⟳ Evaluating code on validation server...', 'sys');
        this.btnSubmit.disabled = true;
        this.btnSubmit.textContent = 'EVALUATING...';

        try {
            const result = await this.api.submitChallenge(
                this.state.currentLevel,
                this.state.activeDoor.type,
                [],        // actions array (legacy)
                timeTaken,
                1,         // playerId
                code       // new: submitted code
            );
            this.btnSubmit.disabled = false;
            this.btnSubmit.textContent = 'SUBMIT SOLUTION';
            this.callbacks.onComplete(result);
        } catch (e) {
            console.error('Submit error:', e);
            this._log('Backend unreachable — using code-analysis scoring', 'warn');
            const ops = this.codeEditor?._detectOperations(code) ?? [];
            const score = Math.min(1, 0.3 + ops.length * 0.12);
            const success = score >= 0.7;
            const demoResult = {
                success,
                score,
                target: 0.7,
                stars: success ? (score >= 0.85 ? 2 : 1) : 0,
                message: success ? `Good work! Detected ${ops.length} ML operations.` : 'Not enough ML operations found in code.',
                metric_name: this.challengeData?.target_metric || 'cleaning_accuracy',
                feedback: ops.map(op => ({ action: op, status: 'correct', message: `✓ ${op}` })),
            };
            this.btnSubmit.disabled = false;
            this.btnSubmit.textContent = 'SUBMIT SOLUTION';
            this.callbacks.onComplete(demoResult);
        }
    }

    // ─────────────────────────────────────────────
    //  LOG
    // ─────────────────────────────────────────────

    _log(message, type = 'info') {
        const p = document.createElement('p');
        p.className = `terminal-log log-${type}`;
        const t = new Date().toLocaleTimeString([], { hour12: false });
        p.innerHTML = `<span class="log-time">[${t}]</span> ${message}`;
        this.outputEl.appendChild(p);
        this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }
}
