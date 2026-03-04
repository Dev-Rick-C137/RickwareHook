'use strict';

const state = {
    messages: [],
    activeMessageIndex: 0,
    webhooks: [],
};

function uid() { return Math.random().toString(36).slice(2, 9); }

function createEmptyEmbed() {
    return { id: uid(), color: '#7b00aa', author: { name: '', url: '', iconUrl: '' }, title: '', titleUrl: '', description: '', fields: [], thumbnail: '', image: '', images: ['','',''], footer: { text: '', iconUrl: '' }, timestamp: false, timestampValue: '', collapsed: false };
}
function createEmptyButton() { return { id: uid(), label: '', url: '', emoji: '' }; }
function createEmptyMessage() { return { id: uid(), content: '', username: '', avatarUrl: '', threadName: '', embeds: [], buttons: [], files: [] }; }
function getMsg() { return state.messages[state.activeMessageIndex] || null; }

function init() {
    bindGlobalEvents();
    addMessage();
}

function addMessage(data) {
    const msg = createEmptyMessage();
    if (data) Object.assign(msg, data);
    state.messages.push(msg);
    state.activeMessageIndex = state.messages.length - 1;
    renderSidebar(); renderEditor(); renderPreview();
}

function removeMessage(index) {
    if (state.messages.length <= 1) { showToast('At least one message required', 'warning'); return; }
    state.messages.splice(index, 1);
    if (state.activeMessageIndex >= state.messages.length) state.activeMessageIndex = state.messages.length - 1;
    renderSidebar(); renderEditor(); renderPreview();
}

function setActiveMessage(index) {
    syncMsgFromDom();
    state.activeMessageIndex = index;
    renderSidebar(); renderEditor(); renderPreview();
}

function renderSidebar() {
    const list = document.getElementById('messageList');
    list.innerHTML = '';
    state.messages.forEach((msg, i) => {
        const label = msg.content ? msg.content.slice(0, 22) + (msg.content.length > 22 ? '…' : '') : msg.embeds.length > 0 ? 'Embed message ' + (i + 1) : 'Message ' + (i + 1);
        const el = document.createElement('div');
        el.className = 'dec-msg-item' + (i === state.activeMessageIndex ? ' active' : '');
        el.innerHTML = '<div class="dec-msg-item-dot"></div><div class="dec-msg-item-text">' + esc(label) + '</div><button class="dec-msg-item-del" title="Delete"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
        el.querySelector('.dec-msg-item-del').addEventListener('click', e => { e.stopPropagation(); removeMessage(i); });
        el.addEventListener('click', () => setActiveMessage(i));
        list.appendChild(el);
    });
}

function syncMsgFromDom() {
    const msg = getMsg(); if (!msg) return;
    const get = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    msg.content = get('messageContent'); msg.username = get('webhookUsername');
    msg.avatarUrl = get('webhookAvatar'); msg.threadName = get('threadName');
}

function renderEditor() {
    const msg = getMsg(); if (!msg) return;
    document.getElementById('messageContent').value = msg.content || '';
    document.getElementById('webhookUsername').value = msg.username || '';
    document.getElementById('webhookAvatar').value = msg.avatarUrl || '';
    document.getElementById('threadName').value = msg.threadName || '';
    updateCharCount(document.getElementById('messageContent'), document.getElementById('contentCharCount'), 2000);
    buildFormatToolbar(document.getElementById('contentFormatToolbar'), 'messageContent');
    renderEmbedsList(); renderButtonsList(); renderFileList();
}

function renderEmbedsList() {
    const msg = getMsg();
    const container = document.getElementById('embedsList');
    container.innerHTML = '';
    if (!msg) return;
    msg.embeds.forEach((embed, i) => container.appendChild(buildEmbedCard(embed, i, msg)));
}

function buildEmbedCard(embed, index, msg) {
    const card = document.createElement('div');
    card.className = 'dec-embed-card';

    const hdr = document.createElement('div');
    hdr.className = 'dec-embed-card-header';
    const strip = document.createElement('div');
    strip.className = 'dec-embed-color-strip';
    strip.style.background = embed.color;
    const titleEl = document.createElement('div');
    titleEl.className = 'dec-embed-card-title';
    titleEl.textContent = 'Embed ' + (index + 1) + (embed.title ? ' — ' + embed.title.slice(0, 18) : '');
    const actions = document.createElement('div');
    actions.className = 'dec-embed-card-actions';

    actions.innerHTML =
        '<button class="dec-icon-btn btn-up" title="Up"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg></button>' +
        '<button class="dec-icon-btn btn-dn" title="Down"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>' +
        '<button class="dec-icon-btn del btn-del" title="Delete"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>' +
        '<button class="dec-icon-btn btn-toggle" title="Toggle"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>';

    hdr.appendChild(strip);
    hdr.appendChild(titleEl);
    hdr.appendChild(actions);

    actions.querySelector('.btn-up').addEventListener('click', e => { e.stopPropagation(); moveEmbed(index, -1); });
    actions.querySelector('.btn-dn').addEventListener('click', e => { e.stopPropagation(); moveEmbed(index, 1); });
    actions.querySelector('.btn-del').addEventListener('click', e => { e.stopPropagation(); msg.embeds.splice(index, 1); renderEmbedsList(); renderPreview(); });
    const toggleFn = () => { embed.collapsed = !embed.collapsed; body.className = 'dec-embed-card-body' + (embed.collapsed ? ' collapsed' : ''); };
    actions.querySelector('.btn-toggle').addEventListener('click', e => { e.stopPropagation(); toggleFn(); });
    hdr.addEventListener('click', toggleFn);

    const body = document.createElement('div');
    body.className = 'dec-embed-card-body' + (embed.collapsed ? ' collapsed' : '');

    const addSection = (label) => {
        const d = document.createElement('div');
        d.className = 'dec-section-divider';
        d.textContent = label;
        body.appendChild(d);
    };

    const addField = (labelText, inputEl, hint) => {
        const g = document.createElement('div');
        g.className = 'dec-field-group';
        if (hint) { g.style.marginBottom = '8px'; }
        const lbl = document.createElement('label');
        lbl.className = 'dec-label';
        lbl.textContent = labelText;
        g.appendChild(lbl);
        g.appendChild(inputEl);
        body.appendChild(g);
        return g;
    };

    const addRow2 = (children) => {
        const row = document.createElement('div');
        row.className = 'dec-row-2';
        children.forEach(c => row.appendChild(c));
        body.appendChild(row);
        return row;
    };

    const makeInput = (val, placeholder, maxlen) => {
        const el = document.createElement('input');
        el.type = 'text'; el.className = 'dec-input';
        el.value = val || ''; el.placeholder = placeholder || '';
        if (maxlen) el.maxLength = maxlen;
        return el;
    };

    const makeTextarea = (val, placeholder, rows, maxlen) => {
        const el = document.createElement('textarea');
        el.className = 'dec-textarea'; el.value = val || '';
        el.placeholder = placeholder || ''; el.rows = rows || 3;
        if (maxlen) el.maxLength = maxlen;
        return el;
    };

    const makeFieldGroup = (lbl, el) => {
        const g = document.createElement('div');
        g.className = 'dec-field-group';
        g.style.marginBottom = '0';
        const label = document.createElement('label');
        label.className = 'dec-label';
        label.textContent = lbl;
        g.appendChild(label);
        g.appendChild(el);
        return g;
    };

    addSection('General');

    const colorWrap = document.createElement('div');
    colorWrap.className = 'dec-color-picker-wrap';
    const swatch = document.createElement('div');
    swatch.className = 'dec-color-swatch';
    swatch.style.background = embed.color;
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color'; colorPicker.value = embed.color;
    swatch.appendChild(colorPicker);
    const colorHex = document.createElement('input');
    colorHex.type = 'text'; colorHex.className = 'dec-color-hex';
    colorHex.value = embed.color; colorHex.maxLength = 7; colorHex.placeholder = '#5865f2';
    colorWrap.appendChild(swatch); colorWrap.appendChild(colorHex);
    const colorGroup = document.createElement('div'); colorGroup.className = 'dec-field-group';
    const colorLabel = document.createElement('label'); colorLabel.className = 'dec-label'; colorLabel.textContent = 'Color';
    colorGroup.appendChild(colorLabel); colorGroup.appendChild(colorWrap);

    const titleIn = makeInput(embed.title, 'Embed title...', 256);
    const titleGroup = document.createElement('div'); titleGroup.className = 'dec-field-group';
    const titleLbl = document.createElement('label'); titleLbl.className = 'dec-label'; titleLbl.textContent = 'Title';
    const titleFmtBar = document.createElement('div'); titleFmtBar.className = 'dec-format-toolbar';
    titleGroup.appendChild(titleLbl); titleGroup.appendChild(titleFmtBar); titleGroup.appendChild(titleIn);

    const titleUrlIn = makeInput(embed.titleUrl, 'https://... (makes title clickable)');
    const titleUrlGroup = document.createElement('div'); titleUrlGroup.className = 'dec-field-group';
    const titleUrlLbl = document.createElement('label'); titleUrlLbl.className = 'dec-label'; titleUrlLbl.textContent = 'Title URL';
    titleUrlGroup.appendChild(titleUrlLbl); titleUrlGroup.appendChild(titleUrlIn);

    const descGroup = document.createElement('div'); descGroup.className = 'dec-field-group';
    const descLabel = document.createElement('label'); descLabel.className = 'dec-label';
    const descCount = document.createElement('span'); descCount.className = 'dec-char-count'; descCount.textContent = '0/4096';
    descLabel.appendChild(document.createTextNode('Description '));
    descLabel.appendChild(descCount);
    const descFmtBar = document.createElement('div'); descFmtBar.className = 'dec-format-toolbar';
    const descEl = makeTextarea(embed.description, 'Embed description... Supports **markdown**', 12, 4096);
    descGroup.appendChild(descLabel); descGroup.appendChild(descFmtBar); descGroup.appendChild(descEl);

    buildCollapsibleSection(body, 'Author', [
        () => {
            const nameIn = makeInput(embed.author.name, 'Author name...', 256);
            const g = makeFieldGroup('Author Name', nameIn);
            nameIn.addEventListener('input', e => { embed.author.name = e.target.value; debouncedPreview(); });

            const urlBtn = document.createElement('button');
            urlBtn.className = 'dec-fmt-btn'; urlBtn.style.cssText = 'width:auto;padding:4px 10px;font-family:inherit;font-size:12px;font-weight:600;margin-top:4px;';
            urlBtn.textContent = '+ Add Author URL';
            const urlIn = makeInput(embed.author.url, 'https://...');
            urlIn.style.display = embed.author.url ? 'block' : 'none';
            if (embed.author.url) urlBtn.style.display = 'none';
            urlBtn.addEventListener('click', () => { urlBtn.style.display = 'none'; urlIn.style.display = 'block'; urlIn.focus(); });
            urlIn.addEventListener('input', e => { embed.author.url = e.target.value; debouncedPreview(); });

            const iconBtn = document.createElement('button');
            iconBtn.className = 'dec-fmt-btn'; iconBtn.style.cssText = 'width:auto;padding:4px 10px;font-family:inherit;font-size:12px;font-weight:600;margin-top:4px;margin-left:6px;';
            iconBtn.textContent = '+ Add Author Icon URL';
            const iconIn = makeInput(embed.author.iconUrl, 'Icon URL https://...');
            iconIn.style.display = embed.author.iconUrl ? 'block' : 'none';
            if (embed.author.iconUrl) iconBtn.style.display = 'none';
            iconBtn.addEventListener('click', () => { iconBtn.style.display = 'none'; iconIn.style.display = 'block'; iconIn.focus(); });
            iconIn.addEventListener('input', e => { embed.author.iconUrl = e.target.value; debouncedPreview(); });

            const btnRow = document.createElement('div'); btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;';
            btnRow.appendChild(urlBtn); btnRow.appendChild(iconBtn);
            const urlG = makeFieldGroup('Author URL', urlIn); urlG.style.marginBottom = '4px';
            const iconG = makeFieldGroup('Author Icon URL', iconIn); iconG.style.marginBottom = '0';

            const wrap = document.createElement('div');
            wrap.appendChild(g); wrap.appendChild(btnRow); wrap.appendChild(urlG); wrap.appendChild(iconG);
            return wrap;
        }
    ]);

    const generalSpacing = document.createElement('div'); generalSpacing.style.height = '4px';
    body.appendChild(generalSpacing);
    body.appendChild(colorGroup);
    body.appendChild(titleGroup);
    body.appendChild(titleUrlGroup);
    body.appendChild(descGroup);

    buildFormatToolbar(titleFmtBar, null, titleIn);
    titleIn.addEventListener('input', e => { embed.title = e.target.value; titleEl.textContent = 'Embed ' + (index + 1) + (embed.title ? ' — ' + embed.title.slice(0, 18) : ''); debouncedPreview(); });
    titleUrlIn.addEventListener('input', e => { embed.titleUrl = e.target.value; debouncedPreview(); });
    buildFormatToolbar(descFmtBar, null, descEl);
    descEl.addEventListener('input', e => { embed.description = e.target.value; updateCharCount(descEl, descCount, 4096); debouncedPreview(); });
    updateCharCount(descEl, descCount, 4096);

    const spacer1 = document.createElement('div'); spacer1.style.height = '6px'; body.appendChild(spacer1);

    const applyColor = (val) => { embed.color = val; swatch.style.background = val; strip.style.background = val; };
    colorPicker.addEventListener('input', e => { applyColor(e.target.value); colorHex.value = e.target.value; debouncedPreview(); });
    colorHex.addEventListener('input', e => { const v = e.target.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) { applyColor(v); colorPicker.value = v; debouncedPreview(); } });

    buildCollapsibleSection(body, 'Images', [
        () => {
            const thumbRow = document.createElement('div'); thumbRow.className = 'dec-image-upload-row';
            const thumbIn = makeInput(embed.thumbnail, 'Thumbnail URL https://...');
            thumbIn.addEventListener('input', e => { embed.thumbnail = e.target.value; debouncedPreview(); });
            const thumbUploadBtn = makeImageUploadBtn(url => { embed.thumbnail = url; thumbIn.value = url; debouncedPreview(); });
            const thumbG = makeFieldGroup('Thumbnail URL', thumbIn);
            thumbRow.appendChild(thumbG);
            thumbRow.appendChild(makeAltLabel());
            thumbRow.appendChild(thumbUploadBtn);

            const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
            wrap.appendChild(thumbRow);

            if (!embed.images) embed.images = ['', '', ''];
            while (embed.images.length < 3) embed.images.push('');

            const mainImgRow = document.createElement('div'); mainImgRow.className = 'dec-image-upload-row';
            const mainImgIn = makeInput(embed.image, 'Image URL https://...');
            mainImgIn.addEventListener('input', e => { embed.image = e.target.value; debouncedPreview(); });
            const mainUploadBtn = makeImageUploadBtn(url => { embed.image = url; mainImgIn.value = url; debouncedPreview(); });
            const mainImgG = makeFieldGroup('Image URL', mainImgIn);
            mainImgRow.appendChild(mainImgG);
            mainImgRow.appendChild(makeAltLabel());
            mainImgRow.appendChild(mainUploadBtn);
            wrap.appendChild(mainImgRow);

            const extraContainer = document.createElement('div'); extraContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
            let extraCount = embed.images.filter(u => u).length;

            const renderExtraImages = () => {
                extraContainer.innerHTML = '';
                embed.images.forEach((imgUrl, ii) => {
                    const row = document.createElement('div'); row.className = 'dec-image-upload-row';
                    const inp = makeInput(imgUrl, 'Additional Image URL ' + (ii + 1) + ' https://...');
                    inp.addEventListener('input', e => { embed.images[ii] = e.target.value; debouncedPreview(); });
                    const upBtn = makeImageUploadBtn(url => { embed.images[ii] = url; inp.value = url; debouncedPreview(); });
                    const g = makeFieldGroup('Image ' + (ii + 1), inp);
                    row.appendChild(g); row.appendChild(makeAltLabel()); row.appendChild(upBtn);
                    extraContainer.appendChild(row);
                });
            };

            if (embed.images.some(u => u)) renderExtraImages();
            wrap.appendChild(extraContainer);

            const addImgBtn = document.createElement('button');
            addImgBtn.className = 'dec-fmt-btn'; addImgBtn.style.cssText = 'width:auto;padding:5px 12px;font-family:inherit;font-size:12px;margin-top:2px;';
            addImgBtn.textContent = '+ Add Image';
            addImgBtn.addEventListener('click', () => {
                if (embed.images.filter(u => u !== undefined).length >= 3) { showToast('Max 3 extra images', 'warning'); return; }
                renderExtraImages();
                wrap.contains(addImgBtn) || wrap.appendChild(addImgBtn);
            });
            if (embed.images.length < 3) wrap.appendChild(addImgBtn);

            return wrap;
        }
    ]);

    const spacer2 = document.createElement('div'); spacer2.style.height = '6px'; body.appendChild(spacer2);

    buildCollapsibleSection(body, 'Footer', [
        () => {
            const footerTextIn = makeInput(embed.footer.text, 'Footer text...', 2048);
            footerTextIn.addEventListener('input', e => { embed.footer.text = e.target.value; debouncedPreview(); });
            const footerIconIn = makeInput(embed.footer.iconUrl, 'https://...');
            footerIconIn.addEventListener('input', e => { embed.footer.iconUrl = e.target.value; debouncedPreview(); });

            const tsGroup = document.createElement('div'); tsGroup.className = 'dec-field-group';
            const tsLabel = document.createElement('label'); tsLabel.className = 'dec-label'; tsLabel.textContent = 'Timestamp';
            const tsRow = document.createElement('div'); tsRow.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap';
            const tsToggleLabel = document.createElement('label'); tsToggleLabel.className = 'dec-inline-toggle';
            const tsSwitch = document.createElement('span'); tsSwitch.className = 'dec-toggle-switch';
            const tsCheck = document.createElement('input'); tsCheck.type = 'checkbox'; tsCheck.checked = embed.timestamp;
            const tsSlider = document.createElement('span'); tsSlider.className = 'dec-toggle-slider';
            tsSwitch.appendChild(tsCheck); tsSwitch.appendChild(tsSlider);
            tsToggleLabel.appendChild(tsSwitch); tsToggleLabel.appendChild(document.createTextNode('Enable'));
            const tsVal = document.createElement('input'); tsVal.type = 'datetime-local'; tsVal.className = 'dec-input';
            tsVal.style.cssText = 'flex:1;min-width:160px'; tsVal.value = embed.timestampValue || ''; tsVal.disabled = !embed.timestamp;
            tsRow.appendChild(tsToggleLabel); tsRow.appendChild(tsVal);
            tsGroup.appendChild(tsLabel); tsGroup.appendChild(tsRow);
            tsCheck.addEventListener('change', e => {
                embed.timestamp = e.target.checked;
                if (e.target.checked && !embed.timestampValue) { embed.timestampValue = new Date().toISOString().slice(0, 16); tsVal.value = embed.timestampValue; }
                tsVal.disabled = !e.target.checked; debouncedPreview();
            });
            tsVal.addEventListener('change', e => { embed.timestampValue = e.target.value; debouncedPreview(); });

            const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
            wrap.appendChild(makeFieldGroup('Footer Text', footerTextIn));
            wrap.appendChild(makeFieldGroup('Footer Icon URL', footerIconIn));
            wrap.appendChild(tsGroup);
            return wrap;
        }
    ]);

    const spacer3 = document.createElement('div'); spacer3.style.height = '6px'; body.appendChild(spacer3);

    addSection('Fields (' + embed.fields.length + '/25)');
    const fieldsWrap = document.createElement('div');
    embed.fields.forEach((field, fi) => fieldsWrap.appendChild(buildFieldCard(field, fi, embed)));
    body.appendChild(fieldsWrap);
    const addFieldBtn = document.createElement('button');
    addFieldBtn.className = 'dec-add-field-btn';
    addFieldBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Field';
    addFieldBtn.addEventListener('click', () => {
        if (embed.fields.length >= 25) { showToast('Max 25 fields', 'warning'); return; }
        embed.fields.push({ id: uid(), name: '', value: '', inline: false });
        renderEmbedsList(); renderPreview();
    });
    body.appendChild(addFieldBtn);

    card.appendChild(hdr);
    card.appendChild(body);
    return card;
}

function makeAltLabel() {
    const d = document.createElement('div');
    d.className = 'dec-image-upload-alt';
    d.innerHTML = '<span></span><span style="color:var(--text-tertiary);font-size:11px;white-space:nowrap;flex-shrink:0">or upload</span><span></span>';
    return d;
}

function makeImageUploadBtn(onUrl) {
    const btn = document.createElement('button');
    btn.className = 'dec-img-upload-btn';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Image (jpg, png, webp, gif)';
    btn.addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp,image/gif';
        inp.onchange = e => {
            const f = e.target.files[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = ev => { onUrl(ev.target.result); };
            reader.readAsDataURL(f);
        };
        inp.click();
    });
    return btn;
}

function buildCollapsibleSection(parent, title, builderFns, startOpen) {
    const hdr = document.createElement('div');
    hdr.className = 'dec-section-collapse-header';
    const titleEl = document.createElement('div');
    titleEl.className = 'dec-section-collapse-title';
    titleEl.innerHTML = '<span>' + esc(title) + '</span>';
    const arrow = document.createElement('svg');
    arrow.setAttribute('viewBox', '0 0 24 24');
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke', 'currentColor');
    arrow.setAttribute('stroke-width', '2');
    arrow.className = 'dec-section-collapse-arrow' + (startOpen ? ' open' : '');
    arrow.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
    hdr.appendChild(titleEl); hdr.appendChild(arrow);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'dec-section-collapse-body' + (startOpen ? '' : ' closed');
    const inner = document.createElement('div');
    inner.className = 'dec-section-collapse-inner';
    builderFns.forEach(fn => { const el = fn(); if (el) inner.appendChild(el); });
    bodyEl.appendChild(inner);

    hdr.addEventListener('click', () => {
        const isOpen = !bodyEl.classList.contains('closed');
        bodyEl.classList.toggle('closed', isOpen);
        arrow.classList.toggle('open', !isOpen);
    });

    parent.appendChild(hdr);
    parent.appendChild(bodyEl);
}

function buildFieldCard(field, index, embed) {
    const card = document.createElement('div');
    card.className = 'dec-field-card';
    const hdr = document.createElement('div'); hdr.className = 'dec-field-card-header';
    hdr.innerHTML = '<span>Field ' + (index + 1) + '</span><button class="dec-icon-btn del"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    hdr.querySelector('.dec-icon-btn.del').addEventListener('click', () => { embed.fields.splice(index, 1); renderEmbedsList(); renderPreview(); });

    const nameG = document.createElement('div'); nameG.className = 'dec-field-group'; nameG.style.marginBottom = '7px';
    const nameLbl = document.createElement('label'); nameLbl.className = 'dec-label'; nameLbl.textContent = 'Name';
    const nameIn = document.createElement('input'); nameIn.type = 'text'; nameIn.className = 'dec-input'; nameIn.value = field.name || ''; nameIn.placeholder = 'Field name'; nameIn.maxLength = 256;
    nameIn.addEventListener('input', e => { field.name = e.target.value; debouncedPreview(); });
    nameG.appendChild(nameLbl); nameG.appendChild(nameIn);

    const valG = document.createElement('div'); valG.className = 'dec-field-group'; valG.style.marginBottom = '7px';
    const valLbl = document.createElement('label'); valLbl.className = 'dec-label'; valLbl.textContent = 'Value';
    const valIn = document.createElement('textarea'); valIn.className = 'dec-textarea'; valIn.value = field.value || ''; valIn.placeholder = 'Field value'; valIn.rows = 2; valIn.maxLength = 1024;
    valIn.addEventListener('input', e => { field.value = e.target.value; debouncedPreview(); });
    valG.appendChild(valLbl); valG.appendChild(valIn);

    const inlineLabel = document.createElement('label'); inlineLabel.className = 'dec-inline-toggle';
    const sw = document.createElement('span'); sw.className = 'dec-toggle-switch';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = field.inline;
    const sl = document.createElement('span'); sl.className = 'dec-toggle-slider';
    sw.appendChild(chk); sw.appendChild(sl);
    inlineLabel.appendChild(sw); inlineLabel.appendChild(document.createTextNode('Inline'));
    chk.addEventListener('change', e => { field.inline = e.target.checked; debouncedPreview(); });

    card.appendChild(hdr); card.appendChild(nameG); card.appendChild(valG); card.appendChild(inlineLabel);
    return card;
}

function moveEmbed(index, dir) {
    const msg = getMsg(); if (!msg) return;
    const ni = index + dir;
    if (ni < 0 || ni >= msg.embeds.length) return;
    [msg.embeds[index], msg.embeds[ni]] = [msg.embeds[ni], msg.embeds[index]];
    renderEmbedsList(); renderPreview();
}

function addEmbed() {
    const msg = getMsg(); if (!msg) return;
    if (msg.embeds.length >= 10) { showToast('Max 10 embeds per message', 'warning'); return; }
    msg.embeds.push(createEmptyEmbed());
    renderEmbedsList(); renderPreview();
    showToast('Embed added', 'success');
    setTimeout(() => { const p = document.getElementById('tab-embeds'); if (p) p.scrollTop = p.scrollHeight; }, 60);
}

function renderButtonsList() {
    const msg = getMsg(); const c = document.getElementById('buttonsList'); c.innerHTML = '';
    if (!msg) return;
    msg.buttons.forEach((btn, i) => c.appendChild(buildButtonCard(btn, i, msg)));
}

function buildButtonCard(btn, index, msg) {
    const card = document.createElement('div'); card.className = 'dec-button-card';
    const hdr = document.createElement('div'); hdr.className = 'dec-button-card-header';
    hdr.innerHTML = '<span>Button ' + (index + 1) + '</span><button class="dec-icon-btn del"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    hdr.querySelector('.dec-icon-btn.del').addEventListener('click', () => { msg.buttons.splice(index, 1); renderButtonsList(); renderPreview(); });
    const row = document.createElement('div'); row.className = 'dec-row-2';
    const makeG = (lbl, placeholder, val, cb) => {
        const g = document.createElement('div'); g.className = 'dec-field-group'; g.style.marginBottom = '0';
        const l = document.createElement('label'); l.className = 'dec-label'; l.textContent = lbl;
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'dec-input'; inp.value = val || ''; inp.placeholder = placeholder;
        inp.addEventListener('input', e => { cb(e.target.value); debouncedPreview(); });
        g.appendChild(l); g.appendChild(inp); return g;
    };
    row.appendChild(makeG('Label', 'Click me', btn.label, v => btn.label = v));
    row.appendChild(makeG('Emoji', '🔗 optional', btn.emoji, v => btn.emoji = v));
    const urlG = makeG('URL', 'https://...', btn.url, v => btn.url = v); urlG.style.marginBottom = '0';
    card.appendChild(hdr); card.appendChild(row); card.appendChild(urlG);
    return card;
}

function renderFileList() {
    const msg = getMsg(); const c = document.getElementById('fileList'); c.innerHTML = '';
    if (!msg) return;
    (msg.files || []).forEach((f, i) => {
        const item = document.createElement('div'); item.className = 'dec-file-item';
        item.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" style="flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="dec-file-item-name">' + esc(f.name) + '</span><span class="dec-file-item-size">' + fmtBytes(f.size) + '</span><button class="dec-icon-btn del" style="margin-left:auto"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
        item.querySelector('.dec-icon-btn.del').addEventListener('click', () => { msg.files.splice(i, 1); renderFileList(); renderPreview(); });
        c.appendChild(item);
    });
}

function fmtBytes(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(2) + ' MB'; }

let previewTimer = null;
function debouncedPreview() { clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 120); }

function renderPreview() {
    syncMsgFromDom();
    const container = document.getElementById('previewMessages'); container.innerHTML = '';
    const msg = getMsg(); if (!msg) return;
    if (!msg.content && !msg.embeds.length && !msg.files.length && !msg.buttons.length) {
        container.innerHTML = '<div class="dec-empty-preview"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Your message will appear here</span></div>';
        renderSidebar(); return;
    }
    const wrap = document.createElement('div'); wrap.className = 'dec-preview-msg';
    const avatar = document.createElement('div'); avatar.className = 'dec-preview-avatar';

    const whUrl = document.getElementById('webhookUrlInput') ? document.getElementById('webhookUrlInput').value.trim() : '';
    const logoGif = 'https://dev-rick-c137.github.io/Launcher/images/main/r_l_logo_1.webp';

    if (msg.avatarUrl) {
        avatar.innerHTML = '<img src="' + esc(msg.avatarUrl) + '" onerror="this.src=\'' + logoGif + '\'">';
    } else if (whUrl && state._webhookInfo && state._webhookInfo.avatar) {
        const avatarUrl = 'https://cdn.discordapp.com/avatars/' + state._webhookInfo.id + '/' + state._webhookInfo.avatar + '.png';
        avatar.innerHTML = '<img src="' + avatarUrl + '" onerror="this.src=\'' + logoGif + '\'">';
    } else {
        avatar.innerHTML = '<img src="' + logoGif + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    }

    let displayName = msg.username || '';
    let channelName = 'general';
    if (!displayName && state._webhookInfo && state._webhookInfo.name) displayName = state._webhookInfo.name;
    if (!displayName) displayName = 'Webhook';
    if (state._webhookInfo && state._webhookInfo.channel_id) channelName = state._webhookInfo.channel_name || state._webhookInfo.channel_id;

    const chanHeader = document.querySelector('.dec-discord-channel-header span');
    if (chanHeader) chanHeader.textContent = channelName;

    const msgBody = document.createElement('div'); msgBody.className = 'dec-preview-msg-body';
    msgBody.innerHTML = '<div class="dec-preview-msg-header"><span class="dec-preview-username">' + esc(displayName) + '</span><span class="dec-preview-bot-tag">BOT</span><span class="dec-preview-timestamp">Today at ' + getTime() + '</span></div>';
    if (msg.content) { const c = document.createElement('div'); c.className = 'dec-preview-content'; c.innerHTML = renderMd(msg.content); msgBody.appendChild(c); }
    msg.embeds.forEach(e => msgBody.appendChild(buildPreviewEmbed(e)));
    if (msg.buttons && msg.buttons.length) {
        const bw = document.createElement('div'); bw.className = 'dec-discord-buttons';
        msg.buttons.forEach(b => {
            if (!b.label && !b.emoji) return;
            const a = document.createElement('a'); a.className = 'dec-discord-link-btn'; a.href = b.url || '#'; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.innerHTML = (b.emoji ? '<span>' + esc(b.emoji) + '</span>' : '') + esc(b.label || 'Button');
            bw.appendChild(a);
        });
        msgBody.appendChild(bw);
    }
    if (msg.files && msg.files.length) {
        const fl = document.createElement('div'); fl.className = 'dec-preview-files';
        msg.files.forEach(f => { fl.innerHTML += '<div class="dec-preview-file-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + esc(f.name) + '</div>'; });
        msgBody.appendChild(fl);
    }
    wrap.appendChild(avatar); wrap.appendChild(msgBody); container.appendChild(wrap);
    renderSidebar();
}

let _webhookFetchTimer = null;
function maybeLoadWebhookInfo(url) {
    if (!url || (!url.includes('discord.com/api/webhooks/') && !url.includes('discordapp.com/api/webhooks/'))) {
        state._webhookInfo = null; debouncedPreview(); return;
    }
    clearTimeout(_webhookFetchTimer);
    _webhookFetchTimer = setTimeout(async () => {
        try {
            const res = await fetch(url);
            if (!res.ok) { state._webhookInfo = null; debouncedPreview(); return; }
            const data = await res.json();
            state._webhookInfo = data;
            debouncedPreview();
        } catch { state._webhookInfo = null; debouncedPreview(); }
    }, 600);
}

function buildPreviewEmbed(e) {
    const wrap = document.createElement('div'); wrap.className = 'dec-discord-embed';
    const pill = document.createElement('div'); pill.className = 'dec-discord-embed-pill'; pill.style.background = e.color || '#5865f2';
    const body = document.createElement('div'); body.className = 'dec-discord-embed-body';

    if (e.author && e.author.name) {
        const au = document.createElement('div'); au.className = 'dec-embed-author';
        if (e.author.iconUrl) au.innerHTML += '<img class="dec-embed-author-icon" src="' + esc(e.author.iconUrl) + '" onerror="this.style.display=\'none\'">';
        const an = document.createElement('div'); an.className = 'dec-embed-author-name';
        an.innerHTML = e.author.url ? '<a href="' + esc(e.author.url) + '" target="_blank">' + esc(e.author.name) + '</a>' : esc(e.author.name);
        au.appendChild(an); body.appendChild(au);
    }

    if (e.thumbnail) { const t = document.createElement('div'); t.className = 'dec-embed-thumbnail'; t.innerHTML = '<img src="' + esc(e.thumbnail) + '" onerror="this.style.display=\'none\'">'; body.appendChild(t); }
    if (e.title) { const t = document.createElement('div'); t.className = 'dec-embed-title'; t.innerHTML = e.titleUrl ? '<a href="' + esc(e.titleUrl) + '" target="_blank">' + esc(e.title) + '</a>' : esc(e.title); body.appendChild(t); }
    if (e.description) { const d = document.createElement('div'); d.className = 'dec-embed-desc'; d.innerHTML = renderMd(e.description); body.appendChild(d); }
    if (e.fields && e.fields.length) {
        const fg = document.createElement('div'); fg.className = 'dec-embed-fields';
        e.fields.forEach(f => { const fe = document.createElement('div'); fe.className = 'dec-embed-field' + (f.inline ? '' : ' full'); fe.innerHTML = '<div class="dec-embed-field-name">' + esc(f.name || '\u200b') + '</div><div class="dec-embed-field-value">' + renderMd(f.value || '\u200b') + '</div>'; fg.appendChild(fe); });
        body.appendChild(fg);
    }
    if (e.image) { const im = document.createElement('div'); im.className = 'dec-embed-image'; im.innerHTML = '<img src="' + esc(e.image) + '" onerror="this.style.display=\'none\'">'; body.appendChild(im); }
    if (e.images) {
        e.images.filter(u => u).forEach(imgUrl => {
            const im = document.createElement('div'); im.className = 'dec-embed-image';
            im.innerHTML = '<img src="' + esc(imgUrl) + '" onerror="this.style.display=\'none\'">'; body.appendChild(im);
        });
    }
    if ((e.footer && e.footer.text) || e.timestamp) {
        const ft = document.createElement('div'); ft.className = 'dec-embed-footer';
        if (e.footer && e.footer.iconUrl) ft.innerHTML += '<img class="dec-embed-footer-icon" src="' + esc(e.footer.iconUrl) + '" onerror="this.style.display=\'none\'">';
        if (e.footer && e.footer.text) ft.innerHTML += '<span class="dec-embed-footer-text">' + esc(e.footer.text) + '</span>';
        if (e.footer && e.footer.text && e.timestamp) ft.innerHTML += '<span class="dec-embed-footer-sep">•</span>';
        if (e.timestamp) { const d = e.timestampValue ? new Date(e.timestampValue) : new Date(); ft.innerHTML += '<span class="dec-embed-footer-text">' + d.toLocaleString() + '</span>'; }
        body.appendChild(ft);
    }
    wrap.appendChild(pill); wrap.appendChild(body); return wrap;
}

function renderMd(text) {
    if (!text) return '';
    let t = esc(text);
    t = t.replace(/&lt;a:([A-Za-z0-9_]+):(\d+)&gt;/g, (_, name, id) =>
        '<img class="dec-custom-emoji-anim" src="https://cdn.discordapp.com/emojis/' + id + '.gif" alt=":' + name + ':" title=":' + name + ':" onerror="this.src=\'https://cdn.discordapp.com/emojis/' + id + '.png\'">');
    t = t.replace(/&lt;:([A-Za-z0-9_]+):(\d+)&gt;/g, (_, name, id) =>
        '<img class="dec-custom-emoji" src="https://cdn.discordapp.com/emojis/' + id + '.png" alt=":' + name + ':" title=":' + name + ':" onerror="this.style.display=\'none\'">');
    t = t.replace(/```([\s\S]+?)```/g, (_, code) => {
        const escaped = code.replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');
        const id = 'cb_' + Math.random().toString(36).slice(2, 8);
        return '<div class="dc-code-block"><div class="dc-code-block-header"><span class="dc-code-lang">code</span><button class="dc-copy-btn" onclick="(function(b){var el=document.getElementById(\'' + id + '\');navigator.clipboard.writeText(el.textContent).then(function(){b.textContent=\'Copied!\';setTimeout(function(){b.textContent=\'Copy\';},1500);})})(this)" title="Copy"><svg width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\'><rect x=\'9\' y=\'9\' width=\'13\' height=\'13\' rx=\'2\'/><path d=\'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\'/></svg> Copy</button></div><pre><code id="' + id + '">' + escaped + '</code></pre></div>';
    });
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\|\|(.+?)\|\|/g, '<span class="dc-blur">$1</span>');
    t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/__(.+?)__/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/_(.+?)_/g, '<em>$1</em>');
    t = t.replace(/~~(.+?)~~/g, '<del>$1</del>');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#00aff4">$1</a>');
    t = t.replace(/@(everyone|here)/g, '<span class="dc-mention">@$1</span>');
    t = t.replace(/&lt;@(\d+)&gt;/g, '<span class="dc-mention">@$1</span>');
    t = t.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="dc-mention">@&$1</span>');
    t = t.replace(/&lt;#(\d+)&gt;/g, '<span class="dc-mention">#$1</span>');
    t = t.replace(/^(\* .+(\n\* .+)*)/gm, (match) => {
        const lines = match.split('\n');
        const buildList = (lines, depth) => {
            let html = '<ul>';
            let i = 0;
            while (i < lines.length) {
                const prefix = '  '.repeat(depth) + '* ';
                if (lines[i].startsWith(prefix)) {
                    const content = lines[i].slice(prefix.length);
                    const subLines = [];
                    let j = i + 1;
                    while (j < lines.length && lines[j].startsWith('  '.repeat(depth + 1) + '* ')) {
                        subLines.push(lines[j]);
                        j++;
                    }
                    if (subLines.length > 0) {
                        html += '<li>' + content + buildList(subLines, depth + 1) + '</li>';
                    } else {
                        html += '<li>' + content + '</li>';
                    }
                    i = j;
                } else {
                    i++;
                }
            }
            html += '</ul>';
            return html;
        };
        return buildList(lines, 0);
    });
    t = t.replace(/\n/g, '<br>');
    return t;
}

function esc(s) { if (typeof s !== 'string') return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function getTime() { const n = new Date(); let h = n.getHours(), m = n.getMinutes(), a = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2,'0') + ' ' + a; }
function updateCharCount(el, disp, max) { if (!disp || !el) return; const l = el.value.length; disp.textContent = l + '/' + max; disp.className = 'dec-char-count' + (l >= max ? ' danger' : l > max * 0.85 ? ' warn' : ''); }

function buildPayload() {
    const msg = getMsg(); if (!msg) return {};
    const p = {};
    if (msg.content) p.content = msg.content;
    if (msg.username) p.username = msg.username;
    if (msg.avatarUrl) p.avatar_url = msg.avatarUrl;
    if (msg.threadName) p.thread_name = msg.threadName;
    if (msg.embeds.length) {
        p.embeds = msg.embeds.map(e => {
            const em = {};
            if (e.color) em.color = parseInt(e.color.replace('#',''), 16);
            if (e.title) em.title = e.title;
            if (e.titleUrl) em.url = e.titleUrl;
            if (e.description) em.description = e.description;
            if (e.author && e.author.name) { em.author = { name: e.author.name }; if (e.author.url) em.author.url = e.author.url; if (e.author.iconUrl) em.author.icon_url = e.author.iconUrl; }
            if (e.thumbnail) em.thumbnail = { url: e.thumbnail };
            if (e.image) em.image = { url: e.image };
            if (e.fields && e.fields.length) em.fields = e.fields.map(f => ({ name: f.name || '\u200b', value: f.value || '\u200b', inline: !!f.inline }));
            if (e.footer && e.footer.text) { em.footer = { text: e.footer.text }; if (e.footer.iconUrl) em.footer.icon_url = e.footer.iconUrl; }
            if (e.timestamp) em.timestamp = e.timestampValue ? new Date(e.timestampValue).toISOString() : new Date().toISOString();
            return em;
        });
    }
    const validBtns = (msg.buttons || []).filter(b => b.label || b.emoji);
    if (validBtns.length) p.components = [{ type: 1, components: validBtns.map(b => ({ type: 2, style: 5, label: b.label || undefined, emoji: b.emoji ? { name: b.emoji } : undefined, url: b.url || 'https://discord.com' })) }];
    return p;
}

async function sendToWebhook(url, payload) {
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const res = await fetch(url + '?wait=true', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.status === 429) {
            const data = await res.json().catch(() => ({}));
            const retryAfter = (data.retry_after || 1) * 1000;
            wmLog('Rate limited on ' + urlLabel(url) + ' — waiting ' + Math.ceil(retryAfter / 1000) + 's (attempt ' + attempt + '/' + MAX_RETRIES + ')', 'warn');
            await sleep(retryAfter + 100);
            continue;
        }
        if (res.ok) return { ok: true };
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err.message || 'HTTP ' + res.status };
    }
    return { ok: false, error: 'Max retries exceeded (rate limit)' };
}

function urlLabel(url) { const parts = url.split('/'); return parts[parts.length - 2] ? '…/' + parts[parts.length - 2].slice(-6) : url.slice(-12); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendWebhook() {
    const activeWh = state.webhooks.filter(w => w.selected);
    if (activeWh.length === 0) {
        const urlEl = document.getElementById('webhookUrlInput');
        const url = urlEl.value.trim();
        if (!url) { showToast('Add a webhook URL first', 'error'); return; }
        if (!url.includes('discord.com/api/webhooks/') && !url.includes('discordapp.com/api/webhooks/')) { showToast('Invalid Discord webhook URL', 'error'); return; }
        syncMsgFromDom(); const p = buildPayload();
        if (!p.content && !p.embeds) { showToast('Message is empty', 'warning'); return; }
        const btn = document.getElementById('sendWebhookBtn');
        btn.disabled = true; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Sending...';
        const result = await sendToWebhook(url, p);
        if (result.ok) showToast('Message sent!', 'success'); else showToast('Error: ' + result.error, 'error');
        btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send';
        return;
    }
    await sendToWebhooks(activeWh);
}

let _bombPaused = false;
let _bombAborted = false;
let _bombPauseResolve = null;
let _totalProxyDataBytes = 0;

function fmtDataSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

function getProxies() {
    const ta = document.getElementById('wmProxyList');
    if (!ta) return [];
    return ta.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

function showProgress(total) {
    const sec = document.getElementById('wmProgressSection');
    if (sec) { sec.style.display = ''; }
    document.getElementById('wmTotalCount').textContent = 'Total: ' + total;
    document.getElementById('wmSentCount').textContent = 'Sent: 0';
    document.getElementById('wmProgressBar').style.width = '0%';
    document.getElementById('wmProgressPct').textContent = '0%';
    document.getElementById('wmProxyData').textContent = 'Data: 0 B';
    document.getElementById('wmPauseBtn').style.display = '';
    document.getElementById('wmResumeBtn').style.display = 'none';
    _bombPaused = false; _bombAborted = false; _totalProxyDataBytes = 0;
}

function updateProgress(sent, total) {
    const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
    document.getElementById('wmProgressBar').style.width = pct + '%';
    document.getElementById('wmProgressPct').textContent = pct + '%';
    document.getElementById('wmSentCount').textContent = 'Sent: ' + sent;
    document.getElementById('wmProxyData').textContent = 'Data: ' + fmtDataSize(_totalProxyDataBytes);
}

function hideProgress() {
    const sec = document.getElementById('wmProgressSection');
    if (sec) sec.style.display = 'none';
}

function waitIfPaused() {
    if (!_bombPaused) return Promise.resolve();
    return new Promise(res => { _bombPauseResolve = res; });
}

async function sendToWebhooks(webhooks) {
    syncMsgFromDom(); const p = buildPayload();
    if (!p.content && !p.embeds) { showToast('Message is empty', 'warning'); return; }
    const delayEnabled = document.getElementById('wmDelayEnabled') ? document.getElementById('wmDelayEnabled').checked : false;
    const delayMs = delayEnabled ? (parseInt(document.getElementById('wmDelayMs')?.value || '500') || 500) : 0;
    const bombMode = document.getElementById('wmBombMode') ? document.getElementById('wmBombMode').checked : false;
    const proxyMode = document.getElementById('wmProxyMode') ? document.getElementById('wmProxyMode').checked : false;
    const msgCount = bombMode ? Math.max(1, Math.min(999999999, parseInt(document.getElementById('wmMsgCount')?.value || '1') || 1)) : 1;
    const proxies = proxyMode ? getProxies() : [];
    const total = webhooks.length * msgCount;

    showProgress(total);
    let sent = 0;
    let proxyIndex = 0;

    for (let wi = 0; wi < webhooks.length; wi++) {
        const wh = webhooks[wi];
        for (let mi = 0; mi < msgCount; mi++) {
            if (_bombAborted) { wmLog('Aborted.', 'warn'); updateProgress(sent, total); showToast('Aborted', 'warning'); renderWebhookManager(); return; }
            await waitIfPaused();
            updateChipStatus(wh.id, 'sending');
            const proxy = proxyMode && proxies.length > 0 ? proxies[proxyIndex % proxies.length] : null;
            proxyIndex++;
            const payloadStr = JSON.stringify(p);
            const payloadBytes = new TextEncoder().encode(payloadStr).length;
            let result;
            try {
                const res = await fetch(wh.url + '?wait=true', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payloadStr });
                if (res.status === 429) {
                    const data = await res.json().catch(() => ({}));
                    const retryAfter = (data.retry_after || 1) * 1000;
                    wmLog('Rate limited — waiting ' + Math.ceil(retryAfter / 1000) + 's', 'warn');
                    await sleep(retryAfter + 100);
                    mi--; continue;
                }
                result = res.ok ? { ok: true } : { ok: false, error: 'HTTP ' + res.status };
            } catch (err) { result = { ok: false, error: err.message }; }
            if (result.ok) {
                _totalProxyDataBytes += payloadBytes;
                sent++;
                wh.lastStatus = 'ok';
                updateChipStatus(wh.id, 'ok');
                wmLog('✓ Sent #' + sent + ' to ' + (wh.name || urlLabel(wh.url)) + (proxy ? ' via proxy' : ''), 'ok');
            } else {
                wh.lastStatus = 'err';
                updateChipStatus(wh.id, 'err');
                wmLog('✗ Failed: ' + (wh.name || urlLabel(wh.url)) + ' — ' + result.error, 'err');
            }
            updateProgress(sent, total);
            if (delayMs > 0) await sleep(delayMs);
        }
    }
    hideProgress();
    showToast('Done — ' + sent + '/' + total + ' sent', 'success');
    renderWebhookManager();
}

function wmLog(msg, type) {
    const log = document.getElementById('wmSendLog');
    if (!log) return;
    const line = document.createElement('div'); line.className = 'dec-wm-log-line ' + (type || 'info');
    const ts = document.createElement('span'); ts.style.color = '#555'; ts.textContent = getTime() + ' ';
    line.appendChild(ts); line.appendChild(document.createTextNode(msg));
    log.appendChild(line); log.scrollTop = log.scrollHeight;
}

function updateChipStatus(id, status) {
    const chip = document.querySelector('.dec-webhook-chip[data-id="' + id + '"]');
    if (chip) { chip.className = 'dec-webhook-chip ' + (status === 'ok' ? 'sent-ok' : status === 'err' ? 'sent-err' : status === 'sending' ? 'sending' : 'selected'); }
}

function renderWebhookChips() {
    const c = document.getElementById('webhookChips'); c.innerHTML = '';
    state.webhooks.forEach(wh => {
        const chip = document.createElement('div');
        chip.className = 'dec-webhook-chip' + (wh.selected ? ' selected' : '');
        chip.dataset.id = wh.id;
        chip.innerHTML = esc(wh.name || urlLabel(wh.url)) + '<button class="dec-webhook-chip-del" title="Remove"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
        chip.addEventListener('click', e => { if (!e.target.closest('.dec-webhook-chip-del')) { wh.selected = !wh.selected; renderWebhookChips(); } });
        chip.querySelector('.dec-webhook-chip-del').addEventListener('click', e => { e.stopPropagation(); state.webhooks = state.webhooks.filter(w => w.id !== wh.id); renderWebhookChips(); renderWebhookManager(); });
        c.appendChild(chip);
    });
}

function renderWebhookManager() {
    const list = document.getElementById('wmWebhookList'); if (!list) return;
    list.innerHTML = '';
    state.webhooks.forEach(wh => {
        const item = document.createElement('div'); item.className = 'dec-wm-item' + (wh.selected ? ' selected' : '');
        const left = document.createElement('div'); left.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;min-width:0;';
        const chk = document.createElement('input'); chk.type = 'checkbox'; chk.className = 'dec-wm-item-check'; chk.checked = !!wh.selected; chk.style.cssText = 'width:16px;height:16px;accent-color:#9b00cc;cursor:pointer;flex-shrink:0;';
        chk.addEventListener('change', e => { wh.selected = e.target.checked; item.className = 'dec-wm-item' + (wh.selected ? ' selected' : ''); renderWebhookChips(); });
        const info = document.createElement('div'); info.className = 'dec-wm-item-info'; info.style.minWidth = '0';
        const name = document.createElement('div'); name.className = 'dec-wm-item-name'; name.textContent = wh.name || 'Webhook';
        const url = document.createElement('div'); url.className = 'dec-wm-item-url'; url.textContent = wh.url;
        info.appendChild(name); info.appendChild(url); left.appendChild(chk); left.appendChild(info);
        const right = document.createElement('div'); right.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';
        const status = document.createElement('div'); status.className = 'dec-wm-item-status' + (wh.lastStatus ? ' ' + wh.lastStatus : '');
        status.textContent = wh.lastStatus === 'ok' ? '✓ Sent' : wh.lastStatus === 'err' ? '✗ Failed' : '';
        const delBtn = document.createElement('button'); delBtn.className = 'dec-icon-btn del'; delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        delBtn.addEventListener('click', () => { state.webhooks = state.webhooks.filter(w => w.id !== wh.id); renderWebhookManager(); renderWebhookChips(); });
        right.appendChild(status); right.appendChild(delBtn);
        item.appendChild(left); item.appendChild(right);
        list.appendChild(item);
    });
}

function addWebhookToList(url, name) {
    if (!url || (!url.includes('discord.com/api/webhooks/') && !url.includes('discordapp.com/api/webhooks/'))) { showToast('Invalid Discord webhook URL', 'error'); return false; }
    if (state.webhooks.length >= 100) { showToast('Max 100 webhooks reached', 'warning'); return false; }
    if (state.webhooks.find(w => w.url === url)) { showToast('Webhook already added', 'warning'); return false; }
    state.webhooks.push({ id: uid(), url, name: name || '', selected: true, lastStatus: null });
    renderWebhookChips(); renderWebhookManager();
    showToast('Webhook added', 'success');
    return true;
}

function loadPayload(p) {
    const msg = getMsg(); if (!msg) return;
    msg.content = p.content || ''; msg.username = p.username || ''; msg.avatarUrl = p.avatar_url || ''; msg.threadName = p.thread_name || '';
    msg.embeds = (p.embeds || []).map(e => {
        const em = createEmptyEmbed();
        if (e.color !== undefined) em.color = '#' + e.color.toString(16).padStart(6,'0');
        em.title = e.title || ''; em.titleUrl = e.url || ''; em.description = e.description || '';
        if (e.author) { em.author.name = e.author.name || ''; em.author.url = e.author.url || ''; em.author.iconUrl = e.author.icon_url || ''; }
        em.thumbnail = e.thumbnail ? e.thumbnail.url : ''; em.image = e.image ? e.image.url : '';
        em.fields = (e.fields || []).map(f => ({ id: uid(), name: f.name || '', value: f.value || '', inline: !!f.inline }));
        if (e.footer) { em.footer.text = e.footer.text || ''; em.footer.iconUrl = e.footer.icon_url || ''; }
        if (e.timestamp) { em.timestamp = true; em.timestampValue = new Date(e.timestamp).toISOString().slice(0,16); }
        return em;
    });
    msg.buttons = [];
    if (p.components && p.components[0] && p.components[0].components) p.components[0].components.forEach(b => { msg.buttons.push({ id: uid(), label: b.label || '', url: b.url || '', emoji: b.emoji ? b.emoji.name : '' }); });
    renderEditor(); renderPreview();
}

function exportJson() { syncMsgFromDom(); const blob = new Blob([JSON.stringify(buildPayload(),null,2)],{type:'application/json'}); const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'discord-message.json'}); a.click(); URL.revokeObjectURL(a.href); showToast('JSON exported','success'); }
function importJson() { const inp = document.createElement('input'); inp.type='file'; inp.accept='.json,application/json'; inp.onchange=async e=>{const f=e.target.files[0];if(!f)return;try{loadPayload(JSON.parse(await f.text()));showToast('JSON imported','success');}catch(err){showToast('Failed: '+err.message,'error');};}; inp.click(); }
function saveBackup() { syncMsgFromDom(); const blob=new Blob([JSON.stringify({version:1,ts:new Date().toISOString(),messages:state.messages,webhooks:state.webhooks.map(w=>({url:w.url,name:w.name}))},null,2)],{type:'application/json'}); const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'dec-backup-'+Date.now()+'.json'}); a.click(); URL.revokeObjectURL(a.href); showToast('Backup saved','success'); }
function clearAll() { if(!confirm('Clear all messages?'))return; state.messages=[]; state.activeMessageIndex=0; addMessage(); showToast('Cleared','info'); }

function handleFiles(files) { const msg=getMsg();if(!msg)return; Array.from(files).forEach(f=>{if(f.size>8*1024*1024){showToast(f.name+' exceeds 8MB','warning');return;} msg.files.push({name:f.name,size:f.size,file:f});}); renderFileList(); renderPreview(); }

function showToast(msg, type) {
    const icons = { success:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>', error:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', warning:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', info:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' };
    const el = document.createElement('div'); el.className = 'dec-toast ' + (type||'info');
    el.innerHTML = (icons[type]||icons.info) + '<span>' + esc(msg) + '</span>';
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(()=>{el.classList.add('removing');setTimeout(()=>el.remove(),250);},3200);
}

let _emojiTarget = null;
let _mentionType = null;

const DISCORD_EMOJI_CATS = {
    'Smileys': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'],
    'People': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸'],
    'Animals': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔'],
    'Food': ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🫖','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾'],
    'Travel': ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🛶','🚤','🛳️','⛴️','🛥️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸','🎆','🎇','🗺️','🌋','⛰️','🏔️','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🪨','🪵','🛖','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽'],
    'Objects': ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💰','💳','🪙','💎','⚖️','🪜','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','🪛','🔫','💣','🔪','🗡️','⚔️','🛡️','🪤','🪣','🧲','🔑','🗝️','🔐','🔏','🔓','🔒','🗄️','🗑️','🗃️','📦','📫','📪','📬','📭','📮','🗳️','✏️','✒️','🖋️','🖊️','📝','📋','📁','📂','🗂️','📅','📆','🗒️','🗓️','📇','📈','📉','📊','📋','📌','📍','✂️','🖇️','📎','🖊️','📏','📐','🗃️'],
    'Symbols': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🔕','🔇','🔈','🔉','🔊','📣','📢','🔔','🔔','🔕','🎵','🎶','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈹','🚺','🚹','🚼','🚻','🚮','🎦','📶','🈴','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏩','⏭️','⏯️','◀️','⏪','⏮️','🔼','⏫','🔽','⏬','⏸️','⏹️','⏺️','🎦','🔅','🔆','📶','📳','🔱','⚜️','🔰','♻️'],
};

function buildEmojiPicker(targetEl) {
    _emojiTarget = targetEl;
    const catContainer = document.getElementById('emojiCats');
    const grid = document.getElementById('emojiGrid');
    const searchInput = document.getElementById('emojiSearch');
    catContainer.innerHTML = '';
    grid.innerHTML = '';

    const cats = Object.keys(DISCORD_EMOJI_CATS);
    let activeCat = cats[0];

    const renderCat = (cat) => {
        grid.innerHTML = '';
        DISCORD_EMOJI_CATS[cat].forEach(emoji => {
            const btn = document.createElement('div');
            btn.className = 'dec-emoji-item';
            btn.textContent = emoji;
            btn.title = emoji;
            btn.addEventListener('click', () => {
                insertAtCursor(targetEl, emoji);
                document.getElementById('emojiModal').classList.add('hidden');
                debouncedPreview();
            });
            grid.appendChild(btn);
        });
    };

    cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'dec-emoji-cat-btn' + (cat === activeCat ? ' active' : '');
        btn.textContent = cat;
        btn.addEventListener('click', () => {
            activeCat = cat;
            document.querySelectorAll('.dec-emoji-cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCat(cat);
        });
        catContainer.appendChild(btn);
    });

    renderCat(activeCat);

    searchInput.value = '';
    searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) { renderCat(activeCat); return; }
        grid.innerHTML = '';
        const allEmojis = [].concat(...Object.values(DISCORD_EMOJI_CATS));
        allEmojis.forEach(emoji => {
            const btn = document.createElement('div');
            btn.className = 'dec-emoji-item';
            btn.textContent = emoji;
            btn.addEventListener('click', () => {
                insertAtCursor(targetEl, emoji);
                document.getElementById('emojiModal').classList.add('hidden');
                debouncedPreview();
            });
            grid.appendChild(btn);
        });
    };

    document.getElementById('emojiModal').classList.remove('hidden');
}

function insertAtCursor(el, text) {
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const val = el.value;
    el.value = val.substring(0, s) + text + val.substring(e);
    el.selectionStart = el.selectionEnd = s + text.length;
    el.focus();
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

function wrapSelection(el, before, after) {
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = el.value.substring(s, e);
    const bLen = before.length, aLen = after.length;
    const hasWrap = s >= bLen && el.value.substring(s - bLen, s) === before && el.value.substring(e, e + aLen) === after;
    if (hasWrap) {
        el.value = el.value.substring(0, s - bLen) + sel + el.value.substring(e + aLen);
        el.selectionStart = s - bLen;
        el.selectionEnd = e - bLen;
    } else {
        const inner = sel || 'text';
        el.value = el.value.substring(0, s) + before + inner + after + el.value.substring(e);
        el.selectionStart = s + bLen;
        el.selectionEnd = s + bLen + inner.length;
    }
    el.focus();
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

function buildFormatToolbar(container, textareaId, directEl) {
    container.innerHTML = '';
    const getEl = () => directEl || (textareaId ? document.getElementById(textareaId) : null);

    const selectionBtns = [
        { label: 'B', title: 'Bold', action: () => wrapSelection(getEl(), '**', '**') },
        { label: 'I', title: 'Italic', fn: 'i', action: () => wrapSelection(getEl(), '*', '*') },
        { label: 'S̶', title: 'Strikethrough', action: () => wrapSelection(getEl(), '~~', '~~') },
        { label: '<>', title: 'Inline Code', action: () => wrapSelection(getEl(), '`', '`') },
        { label: '||', title: 'Spoiler / Blur', action: () => wrapSelection(getEl(), '||', '||') },
        { label: '```', title: 'Code Block', action: () => wrapSelection(getEl(), '```\n', '\n```') },
    ];

    selectionBtns.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'dec-fmt-btn';
        btn.title = b.title;
        btn.innerHTML = b.label;
        if (b.label === 'I') btn.style.fontStyle = 'italic';
        btn.addEventListener('click', e => { e.preventDefault(); b.action(); debouncedPreview(); });
        container.appendChild(btn);
    });

    const sep = document.createElement('div');
    sep.className = 'dec-fmt-sep';
    container.appendChild(sep);

    const insertBtns = [
        {
            label: '😊', title: 'Insert Emoji',
            action: () => { buildEmojiPicker(getEl()); }
        },
        {
            label: '@role', title: 'Mention Role',
            action: () => {
                _mentionType = 'role'; _emojiTarget = getEl();
                document.getElementById('mentionModalTitle').textContent = 'Mention Role';
                document.getElementById('mentionInputLabel').textContent = 'Role ID';
                document.getElementById('mentionIdInput').value = '';
                document.getElementById('mentionIdInput').placeholder = 'Enter Role ID...';
                document.getElementById('mentionModal').classList.remove('hidden');
            }
        },
        {
            label: '@user', title: 'Mention User',
            action: () => {
                _mentionType = 'user'; _emojiTarget = getEl();
                document.getElementById('mentionModalTitle').textContent = 'Mention User';
                document.getElementById('mentionInputLabel').textContent = 'User ID';
                document.getElementById('mentionIdInput').value = '';
                document.getElementById('mentionIdInput').placeholder = 'Enter User ID...';
                document.getElementById('mentionModal').classList.remove('hidden');
            }
        },
        {
            label: '#ch', title: 'Mention Channel',
            action: () => {
                _mentionType = 'channel'; _emojiTarget = getEl();
                document.getElementById('mentionModalTitle').textContent = 'Mention Channel';
                document.getElementById('mentionInputLabel').textContent = 'Channel ID';
                document.getElementById('mentionIdInput').value = '';
                document.getElementById('mentionIdInput').placeholder = 'Enter Channel ID...';
                document.getElementById('mentionModal').classList.remove('hidden');
            }
        },
    ];

    insertBtns.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'dec-fmt-btn';
        btn.title = b.title;
        btn.textContent = b.label;
        btn.addEventListener('click', e => { e.preventDefault(); b.action(); });
        container.appendChild(btn);
    });
}

function bindGlobalEvents() {
    const $=id=>document.getElementById(id);

    $('addMessageBtn').addEventListener('click',()=>addMessage());
    $('addEmbedBtn').addEventListener('click',()=>{
        document.querySelectorAll('.dec-etab').forEach(t=>t.classList.remove('active'));
        document.querySelectorAll('.dec-tab-panel').forEach(p=>p.classList.remove('active'));
        document.querySelector('[data-tab="embeds"]').classList.add('active');
        $('tab-embeds').classList.add('active');
        addEmbed();
    });
    $('sendWebhookBtn').addEventListener('click',sendWebhook);
    $('sendAllWebhooksBtn').addEventListener('click',()=>{
        if(!state.webhooks.length){showToast('No webhooks added yet','warning');return;}
        sendToWebhooks(state.webhooks);
    });
    $('jsonEditorBtn').addEventListener('click',()=>{syncMsgFromDom();$('jsonEditorArea').value=JSON.stringify(buildPayload(),null,2);$('jsonModal').classList.remove('hidden');});
    $('loadMsgBtn').addEventListener('click',()=>$('loadMsgModal').classList.remove('hidden'));
    $('exportJsonBtn').addEventListener('click',exportJson);
    $('importJsonBtn').addEventListener('click',importJson);
    $('saveBackupBtn').addEventListener('click',saveBackup);
    $('clearAllBtn').addEventListener('click',clearAll);

    $('closeJsonModal').addEventListener('click',()=>$('jsonModal').classList.add('hidden'));
    $('applyJsonBtn').addEventListener('click',()=>{try{loadPayload(JSON.parse($('jsonEditorArea').value));$('jsonModal').classList.add('hidden');showToast('JSON applied','success');}catch(e){showToast('Invalid JSON: '+e.message,'error');}});
    $('formatJsonBtn').addEventListener('click',()=>{try{$('jsonEditorArea').value=JSON.stringify(JSON.parse($('jsonEditorArea').value),null,2);}catch{showToast('Invalid JSON','error');}});
    $('validateJsonBtn').addEventListener('click',()=>{try{JSON.parse($('jsonEditorArea').value);showToast('JSON is valid ✓','success');}catch(e){showToast('Invalid: '+e.message,'error');}});
    $('jsonModal').addEventListener('click',e=>{if(e.target===$('jsonModal'))$('jsonModal').classList.add('hidden');});

    $('importJsonFileBtn').addEventListener('click',()=>{
        const inp = document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
        inp.onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const raw=await f.text();$('jsonEditorArea').value=JSON.stringify(JSON.parse(raw),null,2);showToast('JSON file loaded into editor','success');}catch(err){showToast('Failed: '+err.message,'error');}};
        inp.click();
    });

    $('closeLoadMsgModal').addEventListener('click',()=>$('loadMsgModal').classList.add('hidden'));
    $('cancelLoadMsg').addEventListener('click',()=>$('loadMsgModal').classList.add('hidden'));
    $('loadMsgModal').addEventListener('click',e=>{if(e.target===$('loadMsgModal'))$('loadMsgModal').classList.add('hidden');});
    $('confirmLoadMsg').addEventListener('click',()=>{const raw=$('loadMsgJson').value.trim();if(!raw){showToast('Paste a JSON payload first','warning');return;}try{loadPayload(JSON.parse(raw));$('loadMsgModal').classList.add('hidden');showToast('Message loaded','success');}catch(e){showToast('Invalid JSON: '+e.message,'error');}});

    $('addButtonBtn').addEventListener('click',()=>{const msg=getMsg();if(!msg)return;if(msg.buttons.length>=5){showToast('Max 5 buttons','warning');return;}msg.buttons.push(createEmptyButton());renderButtonsList();renderPreview();});

    $('addWebhookBtn').addEventListener('click',()=>{const url=$('webhookUrlInput').value.trim();const name='';if(addWebhookToList(url,name)){$('webhookUrlInput').value='';maybeLoadWebhookInfo(url);}});
    $('webhookUrlInput').addEventListener('keydown',e=>{if(e.key==='Enter'){const url=$('webhookUrlInput').value.trim();if(addWebhookToList(url,''))$('webhookUrlInput').value='';}});
    $('webhookUrlInput').addEventListener('input',e=>{ maybeLoadWebhookInfo(e.target.value.trim()); });

    $('manageWebhooksBtn').addEventListener('click',()=>{renderWebhookManager();$('webhookManagerModal').classList.remove('hidden');});
    $('closeWebhookManager').addEventListener('click',()=>$('webhookManagerModal').classList.add('hidden'));
    $('webhookManagerModal').addEventListener('click',e=>{if(e.target===$('webhookManagerModal'))$('webhookManagerModal').classList.add('hidden');});
    $('wmAddBtn').addEventListener('click',()=>{const url=$('wmUrlInput').value.trim();const name=$('wmNameInput').value.trim();if(addWebhookToList(url,name)){$('wmUrlInput').value='';$('wmNameInput').value='';}});
    $('wmSendSelectedBtn').addEventListener('click',()=>{const sel=state.webhooks.filter(w=>w.selected);if(!sel.length){showToast('No webhooks selected','warning');return;}sendToWebhooks(sel);});
    $('wmSendAllBtn').addEventListener('click',()=>{if(!state.webhooks.length){showToast('No webhooks added','warning');return;}sendToWebhooks(state.webhooks);});
    $('wmSelectAllBtn').addEventListener('click',()=>{state.webhooks.forEach(w=>w.selected=true);renderWebhookChips();renderWebhookManager();});
    $('wmDeselectAllBtn').addEventListener('click',()=>{state.webhooks.forEach(w=>w.selected=false);renderWebhookChips();renderWebhookManager();});

    $('wmBombMode').addEventListener('change',e=>{
        $('wmBombOptions').style.display = e.target.checked ? '' : 'none';
        if (!e.target.checked) hideProgress();
    });
    $('wmProxyMode').addEventListener('change',e=>{ $('wmProxyOptions').style.display = e.target.checked ? '' : 'none'; });

    $('wmBombAll').addEventListener('change',e=>{ if(e.target.checked){$('wmBombSelected').checked=false;} });
    $('wmBombSelected').addEventListener('change',e=>{ if(e.target.checked){$('wmBombAll').checked=false;} });

    $('wmBombSelectAll').addEventListener('click',()=>{state.webhooks.forEach(w=>w.selected=true);renderWebhookChips();renderWebhookManager();});
    $('wmBombDeselectAll').addEventListener('click',()=>{state.webhooks.forEach(w=>w.selected=false);renderWebhookChips();renderWebhookManager();});

    let _filterMode = null;
    $('wmBombSelectByChannel').addEventListener('click',()=>{
        _filterMode = 'channel';
        $('wmBombFilterInput').placeholder = 'Enter Channel ID...';
        $('wmBombFilterRow').style.display = 'flex';
        $('wmBombFilterInput').focus();
    });
    $('wmBombSelectByServer').addEventListener('click',()=>{
        _filterMode = 'server';
        $('wmBombFilterInput').placeholder = 'Enter Server / Guild ID...';
        $('wmBombFilterRow').style.display = 'flex';
        $('wmBombFilterInput').focus();
    });
    $('wmBombFilterApply').addEventListener('click',()=>{
        const val = $('wmBombFilterInput').value.trim();
        if (!val) return;
        state.webhooks.forEach(w => {
            const parts = w.url.split('/');
            if (_filterMode === 'channel') w.selected = parts[parts.length - 2] === val;
            else if (_filterMode === 'server') w.selected = parts[parts.length - 3] === val || (w.serverId && w.serverId === val);
        });
        renderWebhookChips(); renderWebhookManager();
        $('wmBombFilterRow').style.display = 'none'; $('wmBombFilterInput').value = '';
    });

    $('wmProxyList').addEventListener('input',()=>{
        const lines = $('wmProxyList').value.split('\n').length;
        $('wmProxyLineNums').textContent = Array.from({length:lines},(_,i)=>i+1).join('\n');
    });
    $('wmProxyList').addEventListener('scroll',()=>{ $('wmProxyLineNums').scrollTop = $('wmProxyList').scrollTop; });

    $('wmPauseBtn').addEventListener('click',()=>{
        _bombPaused = true;
        $('wmPauseBtn').style.display = 'none';
        $('wmResumeBtn').style.display = '';
    });
    $('wmResumeBtn').addEventListener('click',()=>{
        _bombPaused = false;
        $('wmResumeBtn').style.display = 'none';
        $('wmPauseBtn').style.display = '';
        if (_bombPauseResolve) { _bombPauseResolve(); _bombPauseResolve = null; }
    });
    $('wmAbortBtn').addEventListener('click',()=>{
        _bombAborted = true; _bombPaused = false;
        if (_bombPauseResolve) { _bombPauseResolve(); _bombPauseResolve = null; }
    });;

    document.querySelectorAll('.dec-etab').forEach(tab=>{tab.addEventListener('click',()=>{document.querySelectorAll('.dec-etab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.dec-tab-panel').forEach(p=>p.classList.remove('active'));tab.classList.add('active');$('tab-'+tab.dataset.tab).classList.add('active');});});

    $('messageContent').addEventListener('input',e=>{const msg=getMsg();if(msg)msg.content=e.target.value;updateCharCount(e.target,$('contentCharCount'),2000);debouncedPreview();});
    $('webhookUsername').addEventListener('input',e=>{const msg=getMsg();if(msg)msg.username=e.target.value;debouncedPreview();});
    $('webhookAvatar').addEventListener('input',e=>{const msg=getMsg();if(msg)msg.avatarUrl=e.target.value;debouncedPreview();});
    $('threadName').addEventListener('input',e=>{const msg=getMsg();if(msg)msg.threadName=e.target.value;});

    const dropzone=$('fileDropzone'),fileInput=$('fileInput');
    dropzone.addEventListener('dragover',e=>{e.preventDefault();dropzone.classList.add('dragover');});
    dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop',e=>{e.preventDefault();dropzone.classList.remove('dragover');handleFiles(e.dataTransfer.files);});
    dropzone.addEventListener('click',e=>{if(e.target!==fileInput)fileInput.click();});
    fileInput.addEventListener('change',e=>handleFiles(e.target.files));

    $('previewToggle').addEventListener('click',()=>{
        const panel=$('previewPanel');
        const isHidden = panel.style.display === 'none' || panel.classList.contains('hidden-preview');
        if (isHidden) {
            panel.style.display = '';
            panel.classList.remove('hidden-preview','mobile-visible');
            $('previewToggle').innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Hide';
            $('previewShowBtnWrap').style.display = 'none';
        } else {
            panel.style.display = 'none';
            $('previewToggle').innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/></svg> Show';
            $('previewShowBtnWrap').style.display = 'block';
        }
    });

    $('previewShowBtn').addEventListener('click', () => {
        const panel = $('previewPanel');
        panel.style.display = '';
        panel.classList.add('mobile-visible');
        $('previewShowBtnWrap').style.display = 'none';
        $('previewToggle').innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Hide';
    });

    document.querySelectorAll('.dec-markdown-hints span').forEach(el=>{el.addEventListener('click',()=>{const ta=$('messageContent');const s=ta.selectionStart,en=ta.selectionEnd,sel=ta.value.substring(s,en)||'text';const map={'**bold**':'**'+sel+'**','*italic*':'*'+sel+'*','`code`':'`'+sel+'`','```block```':'```\n'+sel+'\n```','@everyone':'@everyone','@here':'@here'};const ins=map[el.textContent]||el.textContent;ta.value=ta.value.substring(0,s)+ins+ta.value.substring(en);ta.focus();const msg=getMsg();if(msg)msg.content=ta.value;updateCharCount(ta,$('contentCharCount'),2000);debouncedPreview();});});

    $('closeEmojiModal').addEventListener('click', () => $('emojiModal').classList.add('hidden'));
    $('emojiModal').addEventListener('click', e => { if (e.target === $('emojiModal')) $('emojiModal').classList.add('hidden'); });

    $('closeMentionModal').addEventListener('click', () => $('mentionModal').classList.add('hidden'));
    $('cancelMentionModal').addEventListener('click', () => $('mentionModal').classList.add('hidden'));
    $('mentionModal').addEventListener('click', e => { if (e.target === $('mentionModal')) $('mentionModal').classList.add('hidden'); });
    $('confirmMentionModal').addEventListener('click', () => {
        const id = $('mentionIdInput').value.trim();
        if (!id) { showToast('Enter an ID', 'warning'); return; }
        let text = '';
        if (_mentionType === 'role') text = '<@&' + id + '>';
        else if (_mentionType === 'user') text = '<@' + id + '>';
        else if (_mentionType === 'channel') text = '<#' + id + '>';
        if (_emojiTarget) insertAtCursor(_emojiTarget, text);
        $('mentionModal').classList.add('hidden');
        debouncedPreview();
    });
    $('mentionIdInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('confirmMentionModal').click(); });

    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();sendWebhook();}if((e.ctrlKey||e.metaKey)&&e.key==='e'){e.preventDefault();syncMsgFromDom();$('jsonEditorArea').value=JSON.stringify(buildPayload(),null,2);$('jsonModal').classList.remove('hidden');}if(e.key==='Escape'){$('jsonModal').classList.add('hidden');$('loadMsgModal').classList.add('hidden');$('webhookManagerModal').classList.add('hidden');$('emojiModal').classList.add('hidden');$('mentionModal').classList.add('hidden');}});
}

document.addEventListener('DOMContentLoaded', init);