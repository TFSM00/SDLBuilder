let dealCounter = 0;
let cashflowCounter = 0;
let draggedElement = null;
let offsetX = 0;
let offsetY = 0;
let draggedCashflow = null;

const dealTemplates = {
    swap: {
        title: 'Interest Rate Swap',
        hasCashflows: true,
        fields: [
            { label: 'Notional', type: 'text', value: '1,000,000' },
            { label: 'Fixed Rate', type: 'text', value: '3.5%' },
            { label: 'Tenor', type: 'text', value: '5Y' },
            { label: 'Currency', type: 'select', options: ['USD', 'EUR', 'GBP'], value: 'USD' }
        ]
    },
    forward: {
        title: 'FX Forward',
        hasCashflows: false,
        fields: [
            { label: 'Amount', type: 'text', value: '1,000,000' },
            { label: 'Currency Pair', type: 'text', value: 'EUR/USD' },
            { label: 'Forward Rate', type: 'text', value: '1.0850' },
            { label: 'Maturity', type: 'text', value: '3M' }
        ]
    },
    option: {
        title: 'Option',
        hasCashflows: false,
        fields: [
            { label: 'Strike', type: 'text', value: '100' },
            { label: 'Type', type: 'select', options: ['Call', 'Put'], value: 'Call' },
            { label: 'Expiry', type: 'text', value: '1Y' },
            { label: 'Premium', type: 'text', value: '5.25' }
        ]
    },
    bond: {
        title: 'Bond',
        hasCashflows: true,
        fields: [
            { label: 'Face Value', type: 'text', value: '1,000' },
            { label: 'Coupon', type: 'text', value: '4.5%' },
            { label: 'Maturity', type: 'text', value: '10Y' },
            { label: 'Rating', type: 'select', options: ['AAA', 'AA', 'A', 'BBB'], value: 'AA' }
        ]
    }
};

const cashflowTemplate = {
    fields: [
        { label: 'Date', type: 'text', value: '2025-01-01' },
        { label: 'Amount', type: 'text', value: '10,000' },
        { label: 'Type', type: 'select', options: ['Payment', 'Receipt'], value: 'Payment' }
    ]
};

function createDealForm(type, x = 50, y = 50, values = null) {
    dealCounter++;
    const template = dealTemplates[type];
    
    const dealForm = document.createElement('div');
    dealForm.className = 'deal-form';
    dealForm.style.left = x + 'px';
    dealForm.style.top = y + 'px';
    dealForm.dataset.id = dealCounter;
    dealForm.dataset.type = type;

    const header = document.createElement('div');
    header.className = 'deal-header';
    header.innerHTML = `
        <h3>${template.title} #${dealCounter}</h3>
        <div class="deal-actions">
            <button onclick="duplicateDeal(${dealCounter})">Duplicate</button>
            <button onclick="removeDeal(${dealCounter})">×</button>
        </div>
    `;

    const body = document.createElement('div');
    body.className = 'deal-body';
    
    template.fields.forEach((field, index) => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = field.label;
        
        let input;
        if (field.type === 'select') {
            input = document.createElement('select');
            field.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (values && values[index]) {
                    if (opt === values[index]) option.selected = true;
                } else if (opt === field.value) {
                    option.selected = true;
                }
                input.appendChild(option);
            });
        } else {
            input = document.createElement('input');
            input.type = field.type;
            input.value = values ? values[index] : field.value;
        }
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        body.appendChild(formGroup);
    });

    dealForm.appendChild(header);
    dealForm.appendChild(body);

    // Add cashflow section if applicable
    if (template.hasCashflows) {
        const cashflowSection = document.createElement('div');
        cashflowSection.className = 'cashflow-section';
        cashflowSection.dataset.dealId = dealCounter;
        
        const cashflowHeader = document.createElement('h4');
        cashflowHeader.innerHTML = `
            <span>Cashflows</span>
            <div class="cashflow-controls">
                <button onclick="toggleAllCashflows(${dealCounter})">Hide All</button>
            </div>
        `;
        cashflowSection.appendChild(cashflowHeader);

        const addCashflowBtn = document.createElement('button');
        addCashflowBtn.className = 'add-cashflow-btn';
        addCashflowBtn.textContent = '+ Add Cashflow';
        addCashflowBtn.onclick = (e) => {
            e.stopPropagation();
            const thisDealId = parseInt(e.target.closest('.deal-form').dataset.id);
            addCashflow(thisDealId);
        };
        cashflowSection.appendChild(addCashflowBtn);

        const cashflowContainer = document.createElement('div');
        cashflowContainer.className = 'cashflow-container';
        cashflowContainer.dataset.dealId = dealCounter;
        cashflowSection.appendChild(cashflowContainer);

        body.appendChild(cashflowSection);
    }

    header.addEventListener('mousedown', startDrag);

    // Add drop zone events for the entire deal form (for all deals with cashflows)
    if (template.hasCashflows) {
        dealForm.addEventListener('dragover', (e) => {
            if (draggedCashflow) {
                e.preventDefault();
                e.stopPropagation();
                dealForm.style.boxShadow = '0 0 0 3px #28a745';
            }
        });

        dealForm.addEventListener('dragleave', (e) => {
            if (!dealForm.contains(e.relatedTarget)) {
                dealForm.style.boxShadow = '';
            }
        });

        dealForm.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dealForm.style.boxShadow = '';
            if (draggedCashflow) {
                const targetDealId = parseInt(dealForm.dataset.id); // ✅ use the actual deal's dataset ID
                moveCashflowToDeal(draggedCashflow.dataset.cfId, targetDealId);
            }
        });
    }

    document.getElementById('workspace').appendChild(dealForm);
}

function startDrag(e) {
    draggedElement = e.target.closest('.deal-form');
    draggedElement.classList.add('dragging');
    
    const rect = draggedElement.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
    if (!draggedElement) return;
    
    const workspace = document.getElementById('workspace');
    const workspaceRect = workspace.getBoundingClientRect();
    const formRect = draggedElement.getBoundingClientRect();
    
    let x = e.clientX - workspaceRect.left - offsetX + workspace.scrollLeft;
    let y = e.clientY - workspaceRect.top - offsetY + workspace.scrollTop;
    
    // Constrain to workspace boundaries
    x = Math.max(0, Math.min(x, workspace.scrollWidth - formRect.width));
    y = Math.max(0, y);
    
    draggedElement.style.left = x + 'px';
    draggedElement.style.top = y + 'px';
}

function stopDrag() {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

function duplicateDeal(id) {
    const original = document.querySelector(`[data-id="${id}"]`);
    const type = original.dataset.type;
    
    // Get current values from the form
    const inputs = original.querySelectorAll('.deal-body > .form-group input, .deal-body > .form-group select');
    const values = Array.from(inputs).map(input => input.value);
    
    const originalRect = original.getBoundingClientRect();
    const workspace = document.getElementById('workspace');
    const workspaceRect = workspace.getBoundingClientRect();
    
    const newX = originalRect.left - workspaceRect.left + workspace.scrollLeft + 20;
    const newY = originalRect.top - workspaceRect.top + workspace.scrollTop + 20;
    
    createDealForm(type, newX, newY, values);
    
    // Duplicate cashflows if they exist
    const cashflows = original.querySelectorAll('.cashflow-form');
    if (cashflows.length > 0) {
        cashflows.forEach(cf => {
            const cfInputs = cf.querySelectorAll('.form-group input, .form-group select');
            const cfValues = Array.from(cfInputs).map(input => input.value);
            cashflowCounter++;
            createCashflowForm(cashflowCounter, dealCounter, cfValues);
        });
    }
}

function removeDeal(id) {
    const deal = document.querySelector(`[data-id="${id}"]`);
    if (deal) deal.remove();
}

function addCashflow(dealId) {
    cashflowCounter++;
    createCashflowForm(cashflowCounter, dealId);
}

function createCashflowForm(cfId, dealId, values = null) {
    const deal = document.querySelector(`[data-id="${dealId}"]`);
    if (!deal) return;
    
    const cashflowContainer = deal.querySelector(`.cashflow-container[data-deal-id="${dealId}"]`);
    if (!cashflowContainer) return;

    // Calculate the cashflow number within this deal
    const existingCashflows = cashflowContainer.querySelectorAll('.cashflow-form');
    const cashflowNumber = existingCashflows.length + 1;

    const cashflowForm = document.createElement('div');
    cashflowForm.className = 'cashflow-form';
    cashflowForm.dataset.cfId = cfId;
    cashflowForm.dataset.dealId = dealId;
    cashflowForm.dataset.cfNumber = cashflowNumber;
    cashflowForm.draggable = true;

    const header = document.createElement('div');
    header.className = 'cashflow-header';
    header.innerHTML = `
        <h3>Cashflow #${cashflowNumber}</h3>
        <div class="deal-actions">
            <button onclick="event.stopPropagation(); toggleCashflow(${cfId})">${'Hide'}</button>
            <button onclick="event.stopPropagation(); duplicateCashflow(${cfId})">Duplicate</button>
            <button onclick="event.stopPropagation(); removeCashflow(${cfId})">×</button>
        </div>
    `;

    const body = document.createElement('div');
    body.className = 'cashflow-body';
    
    cashflowTemplate.fields.forEach((field, index) => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = field.label;
        
        let input;
        if (field.type === 'select') {
            input = document.createElement('select');
            field.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (values && values[index]) {
                    if (opt === values[index]) option.selected = true;
                } else if (opt === field.value) {
                    option.selected = true;
                }
                input.appendChild(option);
            });
        } else {
            input = document.createElement('input');
            input.type = field.type;
            input.value = values ? values[index] : field.value;
        }
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        body.appendChild(formGroup);
    });

    cashflowForm.appendChild(header);
    cashflowForm.appendChild(body);
    
    cashflowForm.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedCashflow = cashflowForm;
        cashflowForm.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', cashflowForm.innerHTML);
    });

    cashflowForm.addEventListener('dragend', (e) => {
        e.stopPropagation();
        cashflowForm.classList.remove('dragging');
        const allDeals = document.querySelectorAll('.deal-form');
        allDeals.forEach(deal => deal.style.boxShadow = '');
        draggedCashflow = null;
    });

    cashflowContainer.appendChild(cashflowForm);
}

function moveCashflowToDeal(cfId, newDealId) {
    const cashflowForm = document.querySelector(`[data-cf-id="${cfId}"]`);
    if (!cashflowForm) return;

    const oldDealId = parseInt(cashflowForm.dataset.dealId, 10);
    newDealId = parseInt(newDealId, 10);

    const newDeal = document.querySelector(`[data-id="${newDealId}"]`);
    if (!newDeal) return;

    const newContainer = newDeal.querySelector(`.cashflow-container[data-deal-id="${newDealId}"]`);
    if (newContainer) {
        cashflowForm.dataset.dealId = newDealId;
        newContainer.appendChild(cashflowForm);
        renumberCashflows(newDealId);
        if (oldDealId !== newDealId) {
            renumberCashflows(oldDealId);
        }
    }
}

function renumberCashflows(dealId) {
    const deal = document.querySelector(`[data-id="${dealId}"]`);
    if (!deal) return;
    
    const container = deal.querySelector(`.cashflow-container[data-deal-id="${dealId}"]`);
    if (!container) return;
    
    const cashflows = container.querySelectorAll('.cashflow-form');
    cashflows.forEach((cf, index) => {
        const number = index + 1;
        cf.dataset.cfNumber = number;
        const title = cf.querySelector('.cashflow-header h3');
        if (title) {
            title.textContent = `Cashflow #${number}`;
        }
    });
}

function duplicateCashflow(cfId) {
    const original = document.querySelector(`[data-cf-id="${cfId}"]`);
    const dealId = original.dataset.dealId;
    
    const inputs = original.querySelectorAll('.form-group input, .form-group select');
    const values = Array.from(inputs).map(input => input.value);
    
    cashflowCounter++;
    createCashflowForm(cashflowCounter, dealId, values);
}

function removeCashflow(cfId) {
    const cashflow = document.querySelector(`[data-cf-id="${cfId}"]`);
    if (!cashflow) return;
    
    const dealId = cashflow.dataset.dealId;
    cashflow.remove();
    renumberCashflows(dealId);
}

function toggleCashflow(cfId) {
    const cashflow = document.querySelector(`[data-cf-id="${cfId}"]`);
    if (!cashflow) return;
    
    const dealId = parseInt(cashflow.dataset.dealId, 10);
    const hideBtn = cashflow.querySelector('.cashflow-header .deal-actions button:first-child');

    // Toggle visibility
    const hidden = cashflow.classList.toggle('hidden');
    hideBtn.textContent = hidden ? 'Show' : 'Hide';

    // Update parent "Show All / Hide All" button dynamically
    updateCashflowToggleButton(dealId);
}

function toggleAllCashflows(dealId) {
    const container = document.querySelector(`.cashflow-container[data-deal-id="${dealId}"]`);
    if (!container) return;

    const cashflows = container.querySelectorAll('.cashflow-form');
    const toggleBtn = document.querySelector(`[data-id="${dealId}"] .cashflow-controls button`);
    
    const anyVisible = Array.from(cashflows).some(cf => !cf.classList.contains('hidden'));
    const newHiddenState = anyVisible; // hide if any visible, else show all

    cashflows.forEach(cf => {
        const hideBtn = cf.querySelector('.cashflow-header .deal-actions button:first-child');
        cf.classList.toggle('hidden', newHiddenState);
        hideBtn.textContent = newHiddenState ? 'Show' : 'Hide';
    });

    toggleBtn.textContent = newHiddenState ? 'Show All' : 'Hide All';
}

function updateCashflowToggleButton(dealId) {
    // Updates "Show All / Hide All" text dynamically when user toggles individual cashflows
    const container = document.querySelector(`.cashflow-container[data-deal-id="${dealId}"]`);
    const toggleBtn = document.querySelector(`[data-id="${dealId}"] .cashflow-controls button`);
    if (!container || !toggleBtn) return;

    const cashflows = container.querySelectorAll('.cashflow-form');
    const allHidden = Array.from(cashflows).every(cf => cf.classList.contains('hidden'));
    const allVisible = Array.from(cashflows).every(cf => !cf.classList.contains('hidden'));

    // UX rule: show "Show All" only when all are hidden, "Hide All" otherwise
    toggleBtn.textContent = allHidden ? 'Show All' : 'Hide All';
}

document.getElementById('addDeal').addEventListener('click', () => {
    const type = document.getElementById('dealType').value;
    createDealForm(type, 50 + (dealCounter * 20), 50 + (dealCounter * 20));
});