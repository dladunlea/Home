export class EquationDisplay {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
    }

    update(state, onDelete) {
        const numeratorHTML = this.buildNumeratorHTML(state, onDelete);
        const denominatorHTML = this.buildDenominatorHTML(state, onDelete);
        this.render(numeratorHTML, denominatorHTML);
    }

    buildNumeratorHTML(state, onDelete) {
        let html = '';
        
        if (state.scalingFactor !== 1) {
            html += `<span style="color: #666;">${state.scalingFactor}</span>`;
        }
        
        for (let root of state.xIntercepts) {
            const factorText = root >= 0 ? `(x - ${root})` : `(x + ${Math.abs(root)})`;
            html += this.buildFactorHTML(factorText, 'intercept', root, false, false, true);
        }
        
        for (let hole of state.holes) {
            const factorText = hole >= 0 ? `(x - ${hole})` : `(x + ${Math.abs(hole)})`;
            html += this.buildFactorHTML(factorText, 'hole', hole, true);
        }
        
        return html === '' ? '1' : html;
    }

    buildDenominatorHTML(state, onDelete) {
        let html = '';
        
        for (let asym of state.asymptotes) {
            const factorText = asym >= 0 ? `(x - ${asym})` : `(x + ${Math.abs(asym)})`;
            html += this.buildFactorHTML(factorText, 'asymptote', asym, false, true);
        }
        
        for (let hole of state.holes) {
            const factorText = hole >= 0 ? `(x - ${hole})` : `(x + ${Math.abs(hole)})`;
            html += this.buildFactorHTML(factorText, 'hole', hole, true);
        }
        
        return html === '' ? '1' : html;
    }

    buildFactorHTML(text, type, value, isHole = false, isAsymptote = false, isIntercept = false) {
        let classes = 'factor';
        if (isHole) classes += ' hole';
        if (isAsymptote) classes += ' asymptote';
        if (isIntercept) classes += ' intercept';
        
        return `<span class="${classes}" data-type="${type}" data-value="${value}">
            ${text}
            <span class="delete-x">×</span>
        </span>`;
    }

    render(numeratorHTML, denominatorHTML) {
        this.element.innerHTML = `
            <span style="font-size: 1.2em;">f(x) = </span>
            <span style="display: inline-block; width: 12px;"></span>
            <div class="fraction">
                <div class="numerator">${numeratorHTML}</div>
                <div class="denominator">${denominatorHTML}</div>
            </div>
        `;
    }
}