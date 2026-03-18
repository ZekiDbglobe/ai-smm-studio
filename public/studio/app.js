const state = {
  theme: localStorage.getItem("content-studio-theme") || "light",
  filter: "all",
  items: [],
  selectedId: null,
};

const elements = {
  themeToggleButton: document.getElementById("themeToggleButton"),
  logoutButton: document.getElementById("logoutButton"),
  refreshButton: document.getElementById("refreshButton"),
  generateButton: document.getElementById("generateButton"),
  filters: document.getElementById("filters"),
  postList: document.getElementById("postList"),
  listStatusText: document.getElementById("listStatusText"),
  totalCount: document.getElementById("totalCount"),
  reviewCount: document.getElementById("reviewCount"),
  postedCount: document.getElementById("postedCount"),
  detailTitle: document.getElementById("detailTitle"),
  detailState: document.getElementById("detailState"),
  previewImage: document.getElementById("previewImage"),
  imagePlaceholder: document.getElementById("imagePlaceholder"),
  detailStatus: document.getElementById("detailStatus"),
  detailRevision: document.getElementById("detailRevision"),
  detailPrice: document.getElementById("detailPrice"),
  detailDate: document.getElementById("detailDate"),
  captionBox: document.getElementById("captionBox"),
  instructionsBox: document.getElementById("instructionsBox"),
  regenerateButton: document.getElementById("regenerateButton"),
  publishButton: document.getElementById("publishButton"),
  errorBox: document.getElementById("errorBox"),
  revisionList: document.getElementById("revisionList"),
  toast: document.getElementById("toast"),
};

function escapeHtml(value) {
  return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
}

function syncFilterButtons() {
  [...elements.filters.querySelectorAll("[data-status]")].forEach((button) => {
    button.classList.toggle("active", button.dataset.status === state.filter);
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  elements.themeToggleButton.textContent =
      state.theme === "light" ? "Koyu moda geç" : "Açık moda geç";
}

function setButtonsDisabled(disabled) {
  [
    elements.generateButton,
    elements.refreshButton,
    elements.regenerateButton,
    elements.publishButton,
  ].forEach((button) => {
    if (button) {
      button.disabled = disabled;
    }
  });
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 2800);
}


async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    window.location.href = "/studio-login";
    throw new Error("Oturum süresi doldu.");
  }

  const contentType = response.headers.get("content-type") || "";
  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { error: text || "Bilinmeyen bir hata oluştu." };
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || "Bilinmeyen bir hata oluştu.");
  }

  return data;
}

function statusLabel(status) {
  const labels = {
    queued: "Sırada",
    generating: "Üretiliyor",
    review: "İncelemede",
    publishing: "Yayınlanıyor",
    posted: "Yayında",
    generation_failed: "Üretim Hatası",
    failed: "Yayın Hatası",
  };

  return labels[status] || status || "-";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function formatPrice(item) {
  if (item?.price == null) {
    return "-";
  }

  return `${item.price} ${item.currency || ""}`.trim();
}

function renderSummary(items) {
  elements.totalCount.textContent = String(items.length);
  elements.reviewCount.textContent = String(
      items.filter((item) => item.status === "review").length
  );
  elements.postedCount.textContent = String(
      items.filter((item) => item.status === "posted").length
  );
}

function getPlaceholderMarkup(title, description) {
  return `
    <div class="placeholder-stack">
      <div class="placeholder-visual" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 6.5C4 5.67 4.67 5 5.5 5h13C19.33 5 20 5.67 20 6.5v11c0 .83-.67 1.5-1.5 1.5h-13C4.67 19 4 18.33 4 17.5v-11Z" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" stroke-width="1.5"/>
          <path d="m6 17 4.1-4.1a1 1 0 0 1 1.4 0L13 14.4a1 1 0 0 0 1.4 0l1.5-1.5a1 1 0 0 1 1.4 0L19 14.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="placeholder-copy">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(description)}</span>
      </div>
    </div>
  `;
}

function getPostCardMedia(item) {
  if (item?.rendered_image_url) {
    return `
      <div class="post-card-media">
        <img
          src="${escapeHtml(item.rendered_image_url)}"
          alt="${escapeHtml(`${item.departure_city} - ${item.arrival_city}`)}"
          loading="lazy"
        />
      </div>
    `;
  }

  return `
    <div class="post-card-media is-empty">
      ${getPlaceholderMarkup("Görsel yok", "Render sonrası burada küçük önizleme görünür.")}
    </div>
  `;
}

function buildPostCard(item) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `post-card${state.selectedId === item.id ? " active" : ""}`;
  card.innerHTML = `
    ${getPostCardMedia(item)}
    <div class="post-card-body">
      <div class="card-head">
        <span class="status-badge status-${escapeHtml(item.status)}">${escapeHtml(
      statusLabel(item.status)
  )}</span>
        <span class="card-position">#${escapeHtml(item.position ?? "-")}</span>
      </div>

      <p class="route">${escapeHtml(item.departure_city || "-")} → ${escapeHtml(
      item.arrival_city || "-"
  )}</p>

      <div class="card-foot">
        <span>${escapeHtml(formatPrice(item))}</span>
        <span>Rev. ${escapeHtml(item.current_revision || 0)}</span>
      </div>

      <div class="card-subline">
        <span>${escapeHtml(formatDate(item.generated_at || item.created_at))}</span>
      </div>
    </div>
  `;

  card.addEventListener("click", () => {
    state.selectedId = item.id;
    renderList();
    loadDetail(item.id);
  });

  return card;
}

function clearDetail() {
  elements.detailTitle.textContent = "Bir post seç";
  elements.detailState.textContent =
      "Soldaki listeden bir post seç. Görsel, caption ve revizyon geçmişi burada görünecek.";
  elements.detailStatus.textContent = "-";
  elements.detailRevision.textContent = "-";
  elements.detailPrice.textContent = "-";
  elements.detailDate.textContent = "-";
  elements.captionBox.value = "";
  elements.instructionsBox.value = "";
  elements.revisionList.innerHTML = `
    <div class="revision-item empty">
      ${getPlaceholderMarkup("Henüz veri yok", "Seçili postun geçmişi burada listelenecek.")}
    </div>
  `;
  elements.errorBox.classList.add("hidden");
  elements.errorBox.textContent = "";
  setImage(null, "Seçili post için önizleme henüz görünmüyor.");
  elements.regenerateButton.disabled = true;
  elements.publishButton.disabled = true;
}

function renderList() {
  syncFilterButtons();
  renderSummary(state.items);
  elements.postList.innerHTML = "";

  if (!state.items.length) {
    elements.postList.innerHTML = `
      <div class="empty-state">
        ${getPlaceholderMarkup(
        "Bu filtrede içerik yok",
        "Filtreyi değiştir veya yukarıdan yeni taslak üret."
    )}
      </div>
    `;
    return;
  }

  state.items.forEach((item) => {
    elements.postList.appendChild(buildPostCard(item));
  });
}

function setImage(url, emptyText = "Henüz görsel seçilmedi") {
  if (!url) {
    elements.previewImage.removeAttribute("src");
    elements.previewImage.classList.add("hidden");
    elements.imagePlaceholder.innerHTML = getPlaceholderMarkup(
        "Önizleme hazır değil",
        emptyText
    );
    elements.imagePlaceholder.classList.remove("hidden");
    return;
  }

  elements.previewImage.src = url;
  elements.previewImage.classList.remove("hidden");
  elements.imagePlaceholder.classList.add("hidden");
}

function renderDetail(detail) {
  const item = detail?.item;
  const revisions = detail?.revisions || [];

  if (!item) {
    clearDetail();
    return;
  }

  elements.detailTitle.textContent = `${item.departure_city} → ${item.arrival_city}`;
  elements.detailState.textContent =
      item.last_error ||
      "Görseli ve caption'ı kontrol et. İstersen not bırakıp yeniden üret, istersen direkt yayınla.";
  elements.detailStatus.textContent = statusLabel(item.status);
  elements.detailRevision.textContent = String(item.current_revision || 0);
  elements.detailPrice.textContent = formatPrice(item);
  elements.detailDate.textContent = formatDate(item.generated_at || item.created_at);
  elements.captionBox.value = item.caption || "";
  elements.instructionsBox.value = item.last_generation_instructions || "";

  setImage(
      item.rendered_image_url,
      "Bu taslak için henüz render edilmiş bir görsel bulunmuyor."
  );

  if (item.last_error) {
    elements.errorBox.textContent = item.last_error;
    elements.errorBox.classList.remove("hidden");
  } else {
    elements.errorBox.classList.add("hidden");
    elements.errorBox.textContent = "";
  }

  if (!revisions.length) {
    elements.revisionList.innerHTML = `
      <div class="revision-item empty">
        ${getPlaceholderMarkup(
        "Henüz revizyon yok",
        "Regenerate aksiyonu sonrası bu alan geçmişi gösterecek."
    )}
      </div>
    `;
  } else {
    elements.revisionList.innerHTML = revisions
        .map(
            (revision) => `
          <div class="revision-item">
            <strong>Revizyon ${escapeHtml(revision.revision_number || "-")}</strong>
            <p>${escapeHtml(revision.instructions || "Ek not yok.")}</p>
            <span class="revision-date">${escapeHtml(
                formatDate(revision.created_at)
            )}</span>
          </div>
        `
        )
        .join("");
  }

  elements.regenerateButton.disabled =
      item.status === "publishing" || item.status === "posted";

  elements.publishButton.disabled =
      item.status !== "review" && item.status !== "failed";
}

function setListLoading(message = "İçerikler yükleniyor...") {
  elements.listStatusText.textContent = message;
  elements.postList.innerHTML = `
    <div class="empty-state">
      ${getPlaceholderMarkup("Yükleniyor", "Post listesi hazırlanıyor...")}
    </div>
  `;
}
async function loadList() {
  setListLoading();

  const query =
      state.filter && state.filter !== "all"
          ? `?status=${encodeURIComponent(state.filter)}`
          : "";

  const data = await api(`/api/admin/posts${query}`);
  state.items = Array.isArray(data.items) ? data.items : [];

  if (
      state.selectedId &&
      !state.items.some((item) => String(item.id) === String(state.selectedId))
  ) {
    state.selectedId = state.items[0]?.id || null;
  }

  if (!state.selectedId && state.items.length) {
    state.selectedId = state.items[0].id;
  }

  renderList();

  elements.listStatusText.textContent = state.items.length
      ? `${state.items.length} içerik`
      : "İçerik bulunamadı";

  if (state.selectedId) {
    await loadDetail(state.selectedId);
  } else {
    clearDetail();
  }
}

async function loadDetail(id) {
  if (!id) {
    clearDetail();
    return;
  }

  const data = await api(`/api/admin/posts/${id}`);
  renderDetail(data);
}

async function withAction(action, successMessage) {
  try {
    setButtonsDisabled(true);
    await action();
    if (successMessage) {
      showToast(successMessage);
    }
  } catch (error) {
    showToast(error.message || "Bir hata oluştu.");
  } finally {
    setButtonsDisabled(false);
  }
}

applyTheme();
syncFilterButtons();
clearDetail();

elements.themeToggleButton.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  localStorage.setItem("content-studio-theme", state.theme);
  applyTheme();
});


elements.logoutButton.addEventListener("click", async () => {
  try {
    await fetch("/api/studio/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch (error) {
    // ignore
  } finally {
    window.location.href = "/studio-login";
  }
});

elements.refreshButton.addEventListener("click", () => {
  withAction(async () => {
    await loadList();
  }, "Liste yenilendi.");
});

elements.generateButton.addEventListener("click", () => {
  withAction(
      async () => {
        const result = await api("/api/admin/generate-next", {
          method: "POST",
        });

        if (result.queueItemId) {
          state.selectedId = result.queueItemId;
        }

        await loadList();
      },
      "Yeni taslak üretildi."
  );
});

elements.regenerateButton.addEventListener("click", () => {
  if (!state.selectedId) {
    showToast("Önce bir post seç.");
    return;
  }

  withAction(
      async () => {
        await api(`/api/admin/posts/${state.selectedId}/regenerate`, {
          method: "POST",
          body: JSON.stringify({
            instructions: elements.instructionsBox.value.trim() || null,
          }),
        });

        await loadList();
      },
      "Yeni revizyon üretildi."
  );
});

elements.publishButton.addEventListener("click", () => {
  if (!state.selectedId) {
    showToast("Önce bir post seç.");
    return;
  }

  withAction(
      async () => {
        await api(`/api/admin/posts/${state.selectedId}/publish`, {
          method: "POST",
          body: JSON.stringify({
            platforms: ["instagram"],
          }),
        });

        await loadList();
      },
      "Post Instagram’a gönderildi."
  );
});

elements.filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-status]");

  if (!button) {
    return;
  }

  state.filter = button.dataset.status;
  syncFilterButtons();

});


async function initStudio() {
  try {
    applyTheme();
    syncFilterButtons();
    clearDetail();
    setListLoading();

    await loadList();
    showToast("Studio hazır.");
  } catch (error) {
    showToast(error.message || "Studio yüklenemedi.");
  }
}

initStudio();