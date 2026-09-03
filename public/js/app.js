'use strict';

// ==========================================================================
// 1. Preview of selected files in the forms (create / edit).
//    Show every selected file visually: images as thumbnails,
//    other files as a chip with name and size.
// ==========================================================================
function humanSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function renderFilePreview(input) {
  var target = document.getElementById(input.dataset.preview);
  if (!target) return;
  target.innerHTML = '';
  var files = Array.prototype.slice.call(input.files || []);
  if (!files.length) return;

  files.forEach(function (file, index) {
    var item = document.createElement('div');
    item.className = 'preview-item';

    if (file.type.indexOf('image/') === 0) {
      var img = document.createElement('img');
      img.className = 'preview-thumb';
      img.src = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(img.src); };
      item.appendChild(img);
    } else {
      var icon = document.createElement('span');
      icon.className = 'preview-icon';
      icon.textContent = '📄';
      item.appendChild(icon);
    }

    var meta = document.createElement('span');
    meta.className = 'preview-meta';
    meta.innerHTML = '<span class="preview-name">' + escapeHtml(file.name) + '</span>' +
      '<span class="preview-size">' + humanSize(file.size) + '</span>';
    item.appendChild(meta);

    // Button to remove a file from the selection
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'preview-remove';
    remove.textContent = '✕';
    remove.title = 'Remove file';
    remove.addEventListener('click', function () {
      removeFileAt(input, index);
    });
    item.appendChild(remove);

    target.appendChild(item);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Accumulate files: on a repeated pick the new files are ADDED to the ones
// already selected instead of replacing them (natively input.files is reset).
function accumulateFiles(input, newFiles) {
  var dt = new DataTransfer();
  var existing = Array.prototype.slice.call(input.files || []);
  // Files accumulated so far (cached on the input itself)
  (input._acc || existing).forEach(function (f) { dt.items.add(f); });
  Array.prototype.slice.call(newFiles).forEach(function (f) {
    // skip obvious duplicates by name + size
    var dup = Array.prototype.slice.call(dt.files).some(function (x) {
      return x.name === f.name && x.size === f.size;
    });
    if (!dup) dt.items.add(f);
  });
  input.files = dt.files;
  input._acc = Array.prototype.slice.call(dt.files);
}

function removeFileAt(input, index) {
  var dt = new DataTransfer();
  Array.prototype.slice.call(input.files).forEach(function (f, i) {
    if (i !== index) dt.items.add(f);
  });
  input.files = dt.files;
  input._acc = Array.prototype.slice.call(dt.files);
  renderFilePreview(input);
}

document.querySelectorAll('input[type="file"][data-preview]').forEach(function (input) {
  input.addEventListener('change', function () {
    accumulateFiles(input, input.files);
    renderFilePreview(input);
  });
});

// ==========================================================================
// 2. Drag & drop on the kanban board.
//    When a card is dropped over a column we submit a form (POST) that
//    changes the status — data goes to the server via a form, the page
//    is re-rendered (SSR).
// ==========================================================================
var draggedId = null;

document.querySelectorAll('.ticket[draggable="true"]').forEach(function (card) {
  card.addEventListener('dragstart', function (e) {
    draggedId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires something in dataTransfer for drag to work
    e.dataTransfer.setData('text/plain', card.dataset.id);
  });
  card.addEventListener('dragend', function () {
    card.classList.remove('dragging');
    draggedId = null;
    document.querySelectorAll('.column-body.drag-over').forEach(function (z) {
      z.classList.remove('drag-over');
    });
  });
});

// ==========================================================================
// 3. Lightbox: clicking an attachment thumbnail opens the image fullscreen.
// ==========================================================================
(function () {
  var box = document.getElementById('lightbox');
  if (!box) return;
  var img = box.querySelector('.lightbox-img');
  var caption = box.querySelector('.lightbox-caption');
  var closeBtn = box.querySelector('.lightbox-close');

  function open(src, title) {
    img.src = src;
    img.alt = title || '';
    caption.textContent = title || '';
    box.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function close() {
    box.hidden = true;
    img.src = '';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('a.thumb').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault(); // don't open a new tab — show fullscreen instead
      var full = link.getAttribute('href');
      var thumbImg = link.querySelector('img');
      open(full, thumbImg ? thumbImg.getAttribute('alt') : '');
    });
  });

  closeBtn.addEventListener('click', close);
  box.addEventListener('click', function (e) {
    if (e.target === box) close(); // click on the dark backdrop closes
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !box.hidden) close();
  });
})();

document.querySelectorAll('.column-body[data-dropzone]').forEach(function (zone) {
  zone.addEventListener('dragover', function (e) {
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', function () {
    zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', function (e) {
    e.preventDefault();
    zone.classList.remove('drag-over');
    var id = draggedId || e.dataTransfer.getData('text/plain');
    var newStatus = zone.dataset.dropzone;
    if (!id) return;

    // Card is already in this column — do nothing
    var card = document.getElementById('task-' + id);
    if (card && card.classList.contains('status-' + newStatus)) return;

    // Submit the hidden form to change the status
    var form = document.getElementById('move-form');
    form.action = '/tasks/' + id + '/status';
    document.getElementById('move-status').value = newStatus;
    form.submit();
  });
});
