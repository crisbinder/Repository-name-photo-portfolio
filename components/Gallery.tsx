"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type WheelEvent } from "react";
import type { PhotoItem } from "../lib/photos";

type Filter = "全部" | PhotoItem["category"];

const filters: Filter[] = ["风光", "人文", "人像", "星空", "全部"];

const PhotoCard = memo(function PhotoCard({
  index,
  photo,
  onSelect
}: {
  index: number;
  photo: PhotoItem;
  onSelect: (photo: PhotoItem) => void;
}) {
  return (
    <article
      className="photo-card"
      style={{ "--stagger-delay": `${Math.min(index, 12) * 45}ms` } as CSSProperties}
    >
      <button
        className="photo-button"
        onClick={() => onSelect(photo)}
        type="button"
        aria-label={`放大查看 ${photo.title}`}
      >
        <img src={photo.src} alt={photo.title} loading="lazy" decoding="async" draggable={false} />
        <span className="photo-title">{photo.title}</span>
        <span className="photo-tag">{photo.category}</span>
      </button>
    </article>
  );
});

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleThemeChange = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };

    document.documentElement.classList.add("theme-switching");

    const applyTheme = () => {
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
    };

    if (transitionDocument.startViewTransition) {
      const transition = transitionDocument.startViewTransition(applyTheme);

      transition.finished.finally(() => {
        document.documentElement.classList.remove("theme-switching");
      });
      return;
    }

    applyTheme();
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-switching");
    }, 760);
  };

  return (
    <button
      className="theme-toggle"
      onClick={handleThemeChange}
      type="button"
      aria-label={theme === "light" ? "切换到暗色模式" : "切换到白色模式"}
    >
      {theme === "light" ? "☼" : "☽"}
    </button>
  );
}

export default function Gallery({ photos }: { photos: PhotoItem[] }) {
  const [activeFilter, setActiveFilter] = useState<Filter>("风光");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [isAuthorOpen, setIsAuthorOpen] = useState(false);
  const [lightboxDirection, setLightboxDirection] = useState<"previous" | "next" | "open">("open");
  const [, startTransition] = useTransition();
  const wheelSwitchTimeRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    const coarsePointer = window.matchMedia("(pointer: coarse)");

    if (coarsePointer.matches) {
      return;
    }

    let frame = 0;
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;

    const updateCursorGlow = () => {
      root.style.setProperty("--cursor-x", `${cursorX}px`);
      root.style.setProperty("--cursor-y", `${cursorY}px`);
      root.style.setProperty("--cursor-opacity", "1");
      frame = 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      cursorX = event.clientX;
      cursorY = event.clientY;

      if (!frame) {
        frame = window.requestAnimationFrame(updateCursorGlow);
      }
    };

    const hideCursorGlow = () => {
      root.style.setProperty("--cursor-opacity", "0");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", hideCursorGlow);
    root.style.setProperty("--cursor-opacity", "0");

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", hideCursorGlow);

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      root.style.removeProperty("--cursor-x");
      root.style.removeProperty("--cursor-y");
      root.style.removeProperty("--cursor-opacity");
    };
  }, []);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    if (selectedPhoto || isAuthorOpen) {
      document.documentElement.classList.add("lightbox-open");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.documentElement.classList.remove("lightbox-open");
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isAuthorOpen, selectedPhoto]);

  const visiblePhotos = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();

    return photos.filter((photo) => {
      const matchesFilter = activeFilter === "全部" || photo.category === activeFilter;
      const text = `${photo.title} ${photo.description} ${photo.category}`.toLowerCase();
      const matchesQuery = keyword.length === 0 || text.includes(keyword);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, deferredQuery, photos]);

  const thumbnailPhotos = useMemo(() => {
    if (!selectedPhoto || visiblePhotos.length <= 7) {
      return visiblePhotos;
    }

    const selectedIndex = visiblePhotos.findIndex((photo) => photo.id === selectedPhoto.id);
    const safeIndex = selectedIndex < 0 ? 0 : selectedIndex;
    const startIndex = Math.min(Math.max(safeIndex - 3, 0), visiblePhotos.length - 7);

    return visiblePhotos.slice(startIndex, startIndex + 7);
  }, [selectedPhoto, visiblePhotos]);

  useEffect(() => {
    if (!selectedPhoto || visiblePhotos.length <= 1) {
      return;
    }

    const currentIndex = visiblePhotos.findIndex((photo) => photo.id === selectedPhoto.id);
    if (currentIndex < 0) {
      return;
    }

    const preloadIndexes = [
      currentIndex,
      currentIndex <= 0 ? visiblePhotos.length - 1 : currentIndex - 1,
      currentIndex >= visiblePhotos.length - 1 ? 0 : currentIndex + 1
    ];

    const preloadImages = preloadIndexes.map((index) => {
      const image = new Image();
      image.decoding = "async";
      image.src = visiblePhotos[index].previewSrc;
      return image;
    });

    return () => {
      preloadImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [selectedPhoto, visiblePhotos]);

  const handleFilterChange = useCallback((filter: Filter) => {
    startTransition(() => {
      setActiveFilter(filter);
    });
  }, [startTransition]);

  const handlePhotoSelect = useCallback((photo: PhotoItem) => {
    setLightboxDirection("open");
    setSelectedPhoto(photo);
  }, []);

  const handleThumbnailSelect = useCallback((photo: PhotoItem) => {
    setLightboxDirection("open");
    setSelectedPhoto(photo);
  }, []);

  const showPreviousPhoto = useCallback(() => {
    setLightboxDirection("previous");
    setSelectedPhoto((currentPhoto) => {
      if (!currentPhoto || visiblePhotos.length === 0) {
        return currentPhoto;
      }

      const currentIndex = visiblePhotos.findIndex((photo) => photo.id === currentPhoto.id);
      const previousIndex = currentIndex <= 0 ? visiblePhotos.length - 1 : currentIndex - 1;

      return visiblePhotos[previousIndex];
    });
  }, [visiblePhotos]);

  const showNextPhoto = useCallback(() => {
    setLightboxDirection("next");
    setSelectedPhoto((currentPhoto) => {
      if (!currentPhoto || visiblePhotos.length === 0) {
        return currentPhoto;
      }

      const currentIndex = visiblePhotos.findIndex((photo) => photo.id === currentPhoto.id);
      const nextIndex = currentIndex < 0 || currentIndex >= visiblePhotos.length - 1 ? 0 : currentIndex + 1;

      return visiblePhotos[nextIndex];
    });
  }, [visiblePhotos]);

  const handleLightboxWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (visiblePhotos.length <= 1 || Math.abs(event.deltaY) < 24) {
      return;
    }

    event.preventDefault();

    const now = window.performance.now();
    if (now - wheelSwitchTimeRef.current < 420) {
      return;
    }

    wheelSwitchTimeRef.current = now;

    if (event.deltaY > 0) {
      showNextPhoto();
      return;
    }

    showPreviousPhoto();
  }, [showNextPhoto, showPreviousPhoto, visiblePhotos.length]);

  useEffect(() => {
    if (!selectedPhoto) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        showPreviousPhoto();
      }

      if (event.key === "ArrowRight") {
        showNextPhoto();
      }

      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPhoto, showNextPhoto, showPreviousPhoto]);

  return (
    <main>
      <div className="cursor-glow" aria-hidden="true" />

      <section className="hero">
        <nav className="topbar" aria-label="主导航">
          <a className="brand" href="#">
            Portfolio / Studio
          </a>
          <button
            className="author-badge"
            onClick={() => setIsAuthorOpen(true)}
            type="button"
            aria-label="查看作者信息"
          >
            <span className="author-avatar">
              <img src="/avatar/Cris.jpg" alt="Crisbinder" />
            </span>
          </button>
        </nav>

        <div className="hero-copy">
          <h1>欢迎来到Crisbinder的个人摄影集~</h1>
          <p className="eyebrow">Shot On : Fujifilm XT4 + Sigma 18-50_F2.8 / TTArtisan 56_F1.8 / SG-image 25_F1.8</p>
        </div>
      </section>

      <section className="controls" aria-label="作品筛选">
        <label className="search-shell">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索图片"
            type="search"
          />
          {query ? (
            <button className="search-clear" onClick={() => setQuery("")} type="button" aria-label="清空搜索">
              ×
            </button>
          ) : null}
        </label>

        <div className="filter-row" role="tablist" aria-label="作品分类">
          {filters.map((filter) => (
            <button
              className={filter === activeFilter ? "filter active" : "filter"}
              key={filter}
              onClick={() => handleFilterChange(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="gallery" aria-live="polite">
        {visiblePhotos.map((photo, index) => (
          <PhotoCard
            index={index}
            key={`${activeFilter}-${deferredQuery}-${photo.id}`}
            photo={photo}
            onSelect={handlePhotoSelect}
          />
        ))}

        {visiblePhotos.length === 0 ? (
          <div className="empty">
            <p>没有找到匹配的图片，换个关键词试试</p>
            {/* <span>换个关键词，或清空搜索后浏览当前分类。</span> */}
            {query ? (
              <button onClick={() => setQuery("")} type="button">
                清空搜索
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <ThemeToggle />

      {isAuthorOpen ? (
        <div className="author-modal" role="dialog" aria-modal="true" onClick={() => setIsAuthorOpen(false)}>
          <div className="author-panel" onClick={(event) => event.stopPropagation()}>
            <button
              className="author-close"
              onClick={() => setIsAuthorOpen(false)}
              type="button"
              aria-label="关闭作者信息"
            >
              ×
            </button>

            <img className="author-modal-avatar" src="/avatar/Cris.jpg" alt="Crisbinder" />
            <div className="author-modal-name">Crisbinder</div>
            <div className="author-modal-subtitle">扫描二维码添加微信或者小红书关注我~</div>

            <div className="author-qr-grid">
              <div className="author-qr-card">
                <img src="/contact/wechat-qr.png" alt="微信二维码" />
                <span>微信</span>
              </div>
              <div className="author-qr-card">
                <img src="/contact/xiaohongshu-qr.png" alt="小红书二维码" />
                <span>小红书</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPhoto ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          style={{ "--lightbox-bg": `url("${selectedPhoto.previewSrc}")` } as CSSProperties}
          onClick={() => setSelectedPhoto(null)}
          onWheel={handleLightboxWheel}
        >
          <div className="lightbox-stage">
            <button
              className="lightbox-image-button"
              data-direction={lightboxDirection}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedPhoto(null);
              }}
              type="button"
              aria-label="退出全屏预览"
            >
              <img key={selectedPhoto.id} src={selectedPhoto.previewSrc} alt={selectedPhoto.title} />
            </button>
          </div>

          <div className="lightbox-footer" onClick={(event) => event.stopPropagation()}>
            <div className="lightbox-caption">
              <span>{selectedPhoto.title} / {selectedPhoto.category}</span>
            </div>

            {visiblePhotos.length > 1 ? (
              <div className="lightbox-thumbbar" aria-label="预览缩略图">
                <button
                  className="lightbox-nav lightbox-prev"
                  onClick={showPreviousPhoto}
                  type="button"
                  aria-label="上一张"
                >
                  <span aria-hidden="true">◁</span>
                </button>

                <div className="lightbox-thumbs">
                  {thumbnailPhotos.map((photo) => (
                    <button
                      className={photo.id === selectedPhoto.id ? "lightbox-thumb active" : "lightbox-thumb"}
                      key={photo.id}
                        onClick={() => handleThumbnailSelect(photo)}
                        type="button"
                        aria-label={`查看 ${photo.title}`}
                      >
                        <img src={photo.src} alt="" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>

                <button
                  className="lightbox-nav lightbox-next"
                  onClick={showNextPhoto}
                  type="button"
                  aria-label="下一张"
                >
                  <span aria-hidden="true">▷</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
