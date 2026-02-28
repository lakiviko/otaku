"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const REF_PATTERN = /^(movie|tv)\/(\d+)$/;

function normalizeInitialState(initialData) {
  return {
    slug: String(initialData.slug || ""),
    name: String(initialData.name || ""),
    overview: String(initialData.overview || ""),
    lists: (initialData.lists || []).map((list, index) => ({
      uid: `list-${index + 1}`,
      name: String(list.name || ""),
      overview: String(list.overview || ""),
      items: (list.items || []).map((item) => String(item || "").trim()).filter(Boolean)
    }))
  };
}

function parseRef(ref) {
  const match = String(ref || "").trim().match(REF_PATTERN);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

export default function ShelfEditClient({ initialData }) {
  const [state, setState] = useState(() => normalizeInitialState(initialData));
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [commitPending, setCommitPending] = useState(false);
  const [commitError, setCommitError] = useState("");
  const [commitInfo, setCommitInfo] = useState(null);
  const [metaByRef, setMetaByRef] = useState({});
  const inFlight = useRef(new Set());
  const justDraggedRef = useRef(false);
  const [dragState, setDragState] = useState({
    fromListIndex: null,
    fromItemIndex: null,
    overListIndex: null,
    overItemIndex: null,
    overEnd: false
  });

  const [modal, setModal] = useState({
    open: false,
    listIndex: null,
    itemIndex: null,
    ref: "",
    error: ""
  });

  const allRefs = useMemo(() => {
    return [...new Set(state.lists.flatMap((list) => list.items).filter(Boolean))];
  }, [state.lists]);

  useEffect(() => {
    const toFetch = allRefs.filter((ref) => {
      if (metaByRef[ref]) return false;
      if (inFlight.current.has(ref)) return false;
      return REF_PATTERN.test(ref);
    });

    if (!toFetch.length) return;

    toFetch.forEach((ref) => inFlight.current.add(ref));

    Promise.all(
      toFetch.map(async (ref) => {
        const parsed = parseRef(ref);
        if (!parsed) {
          return [ref, { title: "Невалидный ref", poster: "/icons/placeholder-poster.svg", subtitle: ref, invalid: true }];
        }

        try {
          const response = await fetch(`/api/title/${parsed.type}/${parsed.id}?language=ru-RU`);
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.detail || payload.error || "Lookup error");
          return [
            ref,
            {
              title: payload.title || ref,
              poster: payload.poster || "/icons/placeholder-poster.svg",
              subtitle: `${parsed.type}/${parsed.id}`,
              invalid: false
            }
          ];
        } catch {
          return [
            ref,
            {
              title: "Не найдено",
              poster: "/icons/placeholder-poster.svg",
              subtitle: ref,
              invalid: true
            }
          ];
        }
      })
    )
      .then((entries) => {
        setMetaByRef((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      })
      .finally(() => {
        toFetch.forEach((ref) => inFlight.current.delete(ref));
      });
  }, [allRefs, metaByRef]);

  const jsonc = useMemo(() => {
    const payload = {
      name: state.name,
      overview: state.overview,
      lists: state.lists.map((list) => ({
        name: list.name,
        overview: list.overview,
        items: list.items.filter(Boolean)
      }))
    };

    return `${JSON.stringify(payload, null, 2)}\n`;
  }, [state]);

  function updateShelfField(field, value) {
    setState((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  function updateListField(listIndex, field, value) {
    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((list, index) => (index === listIndex ? { ...list, [field]: value } : list))
    }));
  }

  function removeListItem(listIndex, itemIndex) {
    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((list, index) => {
        if (index !== listIndex) return list;
        return {
          ...list,
          items: list.items.filter((_, i) => i !== itemIndex)
        };
      })
    }));
  }

  function openItemModal(listIndex, itemIndex) {
    const ref = state.lists[listIndex]?.items[itemIndex] || "";
    setModal({ open: true, listIndex, itemIndex, ref, error: "" });
  }

  function openAddModal(listIndex) {
    setModal({ open: true, listIndex, itemIndex: null, ref: "", error: "" });
  }

  function closeModal() {
    setModal({ open: false, listIndex: null, itemIndex: null, ref: "", error: "" });
  }

  function saveModalRef() {
    if (modal.listIndex === null) return;
    const ref = String(modal.ref || "").trim();
    if (!REF_PATTERN.test(ref)) {
      setModal((prev) => ({ ...prev, error: "Нужен формат tv/12345 или movie/12345" }));
      return;
    }

    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((list, index) => {
        if (index !== modal.listIndex) return list;

        if (modal.itemIndex === null) {
          return { ...list, items: [...list.items, ref] };
        }

        return {
          ...list,
          items: list.items.map((item, itemIndex) => (itemIndex === modal.itemIndex ? ref : item))
        };
      })
    }));

    closeModal();
  }

  function removeFromModal() {
    if (modal.listIndex === null || modal.itemIndex === null) return;
    removeListItem(modal.listIndex, modal.itemIndex);
    closeModal();
  }

  function addList() {
    setState((prev) => ({
      ...prev,
      lists: [
        ...prev.lists,
        {
          uid: `list-${prev.lists.length + 1}-${Date.now()}`,
          name: `Новая тема ${prev.lists.length + 1}`,
          overview: "",
          items: []
        }
      ]
    }));
  }

  function removeList(listIndex) {
    setState((prev) => ({
      ...prev,
      lists: prev.lists.filter((_, index) => index !== listIndex)
    }));
  }

  function moveListItem(fromListIndex, fromItemIndex, toListIndex, toItemIndex) {
    setState((prev) => {
      if (
        fromListIndex === null ||
        fromItemIndex === null ||
        toListIndex === null ||
        toItemIndex === null
      ) {
        return prev;
      }

      const sourceList = prev.lists[fromListIndex];
      const targetList = prev.lists[toListIndex];
      if (!sourceList || !targetList) return prev;
      if (fromItemIndex < 0 || fromItemIndex >= sourceList.items.length) return prev;

      const sourceItems = [...sourceList.items];
      const [moved] = sourceItems.splice(fromItemIndex, 1);
      if (!moved) return prev;

      const targetItems = fromListIndex === toListIndex ? sourceItems : [...targetList.items];
      const normalizedIndex = Math.max(0, Math.min(toItemIndex, targetItems.length));
      const insertIndex =
        fromListIndex === toListIndex && normalizedIndex > fromItemIndex ? normalizedIndex - 1 : normalizedIndex;

      if (fromListIndex === toListIndex && insertIndex === fromItemIndex) return prev;

      targetItems.splice(insertIndex, 0, moved);

      return {
        ...prev,
        lists: prev.lists.map((list, index) => {
          if (index === fromListIndex && index === toListIndex) {
            return { ...list, items: targetItems };
          }
          if (index === fromListIndex) {
            return { ...list, items: sourceItems };
          }
          if (index === toListIndex) {
            return { ...list, items: targetItems };
          }
          return list;
        })
      };
    });
  }

  function moveListItemToEnd(fromListIndex, fromItemIndex, toListIndex) {
    setState((prev) => {
      if (fromListIndex === null || fromItemIndex === null || toListIndex === null) return prev;

      const sourceList = prev.lists[fromListIndex];
      const targetList = prev.lists[toListIndex];
      if (!sourceList || !targetList) return prev;
      if (fromItemIndex < 0 || fromItemIndex >= sourceList.items.length) return prev;

      const sourceItems = [...sourceList.items];
      const [moved] = sourceItems.splice(fromItemIndex, 1);
      if (!moved) return prev;

      const targetItems = fromListIndex === toListIndex ? sourceItems : [...targetList.items];
      if (fromListIndex === toListIndex && fromItemIndex === sourceList.items.length - 1) return prev;
      targetItems.push(moved);

      return {
        ...prev,
        lists: prev.lists.map((list, index) => {
          if (index === fromListIndex && index === toListIndex) {
            return { ...list, items: targetItems };
          }
          if (index === fromListIndex) {
            return { ...list, items: sourceItems };
          }
          if (index === toListIndex) {
            return { ...list, items: targetItems };
          }
          return list;
        })
      };
    });
  }

  function resetDragState() {
    setDragState({
      fromListIndex: null,
      fromItemIndex: null,
      overListIndex: null,
      overItemIndex: null,
      overEnd: false
    });
  }

  function handleDragStart(event, listIndex, itemIndex) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "");
    setDragState({
      fromListIndex: listIndex,
      fromItemIndex: itemIndex,
      overListIndex: listIndex,
      overItemIndex: itemIndex,
      overEnd: false
    });
  }

  function handleDragOverItem(event, listIndex, itemIndex) {
    if (dragState.fromListIndex === null || dragState.fromItemIndex === null) return;
    event.preventDefault();

    if (
      dragState.overListIndex !== listIndex ||
      dragState.overItemIndex !== itemIndex ||
      dragState.overEnd
    ) {
      setDragState((prev) => ({
        ...prev,
        overListIndex: listIndex,
        overItemIndex: itemIndex,
        overEnd: false
      }));
    }
  }

  function handleDropOnItem(event, listIndex, itemIndex) {
    event.preventDefault();
    if (dragState.fromListIndex === null || dragState.fromItemIndex === null) {
      resetDragState();
      return;
    }

    moveListItem(dragState.fromListIndex, dragState.fromItemIndex, listIndex, itemIndex);
    justDraggedRef.current = true;
    resetDragState();
  }

  function handleDragOverEnd(event, listIndex) {
    if (dragState.fromListIndex === null || dragState.fromItemIndex === null) return;
    event.preventDefault();

    if (
      dragState.overListIndex !== listIndex ||
      !dragState.overEnd
    ) {
      setDragState((prev) => ({
        ...prev,
        overListIndex: listIndex,
        overItemIndex: null,
        overEnd: true
      }));
    }
  }

  function handleDropOnEnd(event, listIndex) {
    event.preventDefault();
    if (dragState.fromListIndex === null || dragState.fromItemIndex === null) {
      resetDragState();
      return;
    }

    moveListItemToEnd(dragState.fromListIndex, dragState.fromItemIndex, listIndex);
    justDraggedRef.current = true;
    resetDragState();
  }

  function handleDragEnd() {
    resetDragState();
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);
  }

  function handleCoverClick(listIndex, itemIndex) {
    if (justDraggedRef.current) return;
    openItemModal(listIndex, itemIndex);
  }

  async function copyJsonc() {
    try {
      await navigator.clipboard.writeText(jsonc);
      setCopyError("");
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopyError("Не удалось скопировать. Проверь доступ к буферу обмена.");
    }
  }

  async function commitToGitHub() {
    setCommitPending(true);
    setCommitError("");
    setCommitInfo(null);

    try {
      const response = await fetch(`/api/shelf/${encodeURIComponent(state.slug)}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: jsonc })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || "Commit failed");
      }

      setCommitInfo({
        sha: payload.sha || null,
        commitUrl: payload.commitUrl || null
      });
    } catch (error) {
      setCommitError(error instanceof Error ? error.message : "Не удалось выполнить commit.");
    } finally {
      setCommitPending(false);
    }
  }

  return (
    <div className="shelf-edit">
      <div className="shelf-edit-grid">
        <label className="shelf-edit-label" htmlFor="shelf-name">Название полки</label>
        <input
          id="shelf-name"
          className="shelf-edit-input"
          value={state.name}
          onChange={(event) => updateShelfField("name", event.target.value)}
          placeholder="Название полки"
        />

        <label className="shelf-edit-label" htmlFor="shelf-overview">Описание полки</label>
        <textarea
          id="shelf-overview"
          className="shelf-edit-textarea"
          value={state.overview}
          onChange={(event) => updateShelfField("overview", event.target.value)}
          rows={3}
          placeholder="Короткое описание"
        />
      </div>

      <div className="shelf-edit-lists">
        {state.lists.map((list, listIndex) => (
          <section className="shelf-edit-list" key={list.uid}>
            <div className="shelf-edit-list-head">
              <h4>Тема {listIndex + 1}</h4>
              <button type="button" className="badge shelf-edit-danger" onClick={() => removeList(listIndex)}>Удалить тему</button>
            </div>

            <div className="shelf-edit-grid">
              <label className="shelf-edit-label" htmlFor={`list-name-${list.uid}`}>Название темы</label>
              <input
                id={`list-name-${list.uid}`}
                className="shelf-edit-input"
                value={list.name}
                onChange={(event) => updateListField(listIndex, "name", event.target.value)}
                placeholder="Название темы"
              />

              <label className="shelf-edit-label" htmlFor={`list-overview-${list.uid}`}>Описание темы</label>
              <textarea
                id={`list-overview-${list.uid}`}
                className="shelf-edit-textarea"
                value={list.overview}
                onChange={(event) => updateListField(listIndex, "overview", event.target.value)}
                rows={2}
                placeholder="Описание темы"
              />
            </div>

            <div className="shelf-edit-cards">
              {list.items.map((ref, itemIndex) => {
                const meta = metaByRef[ref];
                const poster = meta?.poster || "/icons/placeholder-poster.svg";
                const title = meta?.title || "Загрузка...";
                const subtitle = meta?.subtitle || ref;

                return (
                  <button
                    type="button"
                    className={[
                      "shelf-edit-cover",
                      dragState.fromListIndex === listIndex && dragState.fromItemIndex === itemIndex
                        ? "shelf-edit-cover--dragging"
                        : "",
                      dragState.overListIndex === listIndex &&
                      dragState.overItemIndex === itemIndex &&
                      !dragState.overEnd
                        ? "shelf-edit-cover--drop-target"
                        : ""
                    ].filter(Boolean).join(" ")}
                    key={`${list.uid}-${itemIndex}-${ref}`}
                    draggable
                    onDragStart={(event) => handleDragStart(event, listIndex, itemIndex)}
                    onDragOver={(event) => handleDragOverItem(event, listIndex, itemIndex)}
                    onDrop={(event) => handleDropOnItem(event, listIndex, itemIndex)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleCoverClick(listIndex, itemIndex)}
                  >
                    <img src={poster} alt={title} loading="lazy" />
                    <div className="shelf-edit-cover-meta">
                      <strong>{title}</strong>
                      <span>{subtitle}</span>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                className={[
                  "shelf-edit-cover",
                  "shelf-edit-cover-phantom",
                  dragState.overListIndex === listIndex && dragState.overEnd ? "shelf-edit-cover--drop-target" : ""
                ].filter(Boolean).join(" ")}
                onClick={() => openAddModal(listIndex)}
                onDragOver={(event) => handleDragOverEnd(event, listIndex)}
                onDrop={(event) => handleDropOnEnd(event, listIndex)}
              >
                <div className="shelf-edit-cover-plus">+</div>
                <div className="shelf-edit-cover-meta">
                  <strong>Добавить</strong>
                </div>
              </button>
            </div>
          </section>
        ))}
      </div>

      <div className="shelf-edit-footer">
        <button type="button" className="shelf-edit-add-list" onClick={addList}>+ Добавить тему</button>
        <button type="button" className="badge shelf-edit-copy" onClick={copyJsonc}>Скопировать JSONC</button>
        <button
          type="button"
          className="badge shelf-edit-copy"
          onClick={commitToGitHub}
          disabled={commitPending}
        >
          {commitPending ? "Коммит..." : "Commit в GitHub"}
        </button>
      </div>

      {copied ? <p className="status">Скопировано в буфер обмена.</p> : null}
      {copyError ? <p className="status">{copyError}</p> : null}
      {commitError ? <p className="status">{commitError}</p> : null}
      {commitInfo ? (
        <p className="status">
          Commit создан{commitInfo.sha ? `: ${commitInfo.sha.slice(0, 7)}` : "."}
          {commitInfo.commitUrl ? (
            <>
              {" "}
              <a href={commitInfo.commitUrl} target="_blank" rel="noreferrer">Открыть в GitHub</a>
            </>
          ) : null}
        </p>
      ) : null}

      <details className="shelf-edit-preview">
        <summary>Предпросмотр JSONC</summary>
        <pre>{jsonc}</pre>
      </details>

      {modal.open ? (
        <div className="shelf-edit-modal-backdrop" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="shelf-edit-modal" onClick={(event) => event.stopPropagation()}>
            <h4>{modal.itemIndex === null ? "Добавить item" : "Редактировать item"}</h4>
            <p className="card-meta">Формат: <code>tv/12345</code> или <code>movie/12345</code></p>
            <input
              className="shelf-edit-input"
              value={modal.ref}
              onChange={(event) => setModal((prev) => ({ ...prev, ref: event.target.value, error: "" }))}
              placeholder="tv/12345"
              autoFocus
            />
            {modal.error ? <p className="status">{modal.error}</p> : null}
            <div className="shelf-edit-modal-actions">
              {modal.itemIndex !== null ? (
                <button type="button" className="badge shelf-edit-danger" onClick={removeFromModal}>Удалить</button>
              ) : null}
              <button type="button" className="badge shelf-edit-secondary" onClick={closeModal}>Отмена</button>
              <button type="button" className="badge shelf-edit-copy" onClick={saveModalRef}>Сохранить</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
