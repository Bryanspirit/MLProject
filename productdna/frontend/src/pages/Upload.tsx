import React from "react";
import SideNavBar from "../components/SideNavBar";
import Icon from "../components/Icon";

/* ----------------------------------------------------------------------------
 * Files-in-flight list
 * ------------------------------------------------------------------------- */

type FileStatus = "queued" | "extracting" | "complete";

interface FileItem {
  name: string;
  meta: string;
  status: FileStatus;
  progress: number;
  /** material symbol shown in the icon cell (non-image rows) */
  icon?: string;
  /** thumbnail url (completed image rows) */
  thumb?: string;
}

const files: FileItem[] = [
  {
    name: "fw24_raw_assets_batch_01.zip",
    meta: "45.2 MB",
    status: "queued",
    progress: 0,
    icon: "folder_zip",
  },
  {
    name: "summer_catalog_metadata.csv",
    meta: "Parsing rows 1,200 / 5,000...",
    status: "extracting",
    progress: 45,
    icon: "autorenew",
  },
  {
    name: "SHOE_HERO_RED_01_v2.jpg",
    meta: "Ready for stewardship",
    status: "complete",
    progress: 100,
    thumb:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBVGS-hjtruWNxnfjoaeTqWrQdNtHl2IfAbBZ4L4eVn0ug0A6m80K1R9cS7vAAfmDkZPfbAiX8nfrfOe1yr-4KzK7tR9yG79ZvxcOl7MsQLCLgB24_GKnzK2jG7bged0Wx5hFkf46aL6jR-26zoIiBY_FaUNujhHuR3mGzz__O6RkPzoe3dPQAFN5BhaUBZBKh6JsyjZyBnfpVN21YlYIdTamZciRsUZeMnY4GsrDDeA0WL4XCEk6OAiz9ncz9b2hkgQ08w0EyBkVqE",
  },
];

const statusConfig: Record<
  FileStatus,
  { label: string; icon: string; iconSpin?: boolean; badge: string; bar: string }
> = {
  queued: {
    label: "Queued",
    icon: "schedule",
    badge:
      "text-on-surface-variant bg-surface-variant border-outline-variant/50",
    bar: "bg-outline",
  },
  extracting: {
    label: "Extracting",
    icon: "sync",
    iconSpin: true,
    badge: "text-primary bg-primary-container/20 border-primary/20",
    bar: "bg-primary",
  },
  complete: {
    label: "Complete",
    icon: "check_circle",
    badge: "text-tertiary bg-tertiary-container/20 border-tertiary/20",
    bar: "bg-tertiary",
  },
};

function FileIconCell({ file }: { file: FileItem }) {
  if (file.status === "complete" && file.thumb) {
    return (
      <div
        className="w-10 h-10 rounded bg-surface-variant flex-shrink-0 border border-outline-variant/30 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url('${file.thumb}')` }}
      />
    );
  }
  if (file.status === "extracting") {
    return (
      <div className="w-10 h-10 rounded bg-surface-variant flex-shrink-0 flex items-center justify-center border border-primary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 animate-pulse" />
        <Icon name={file.icon!} size={20} className="text-primary relative z-10" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded bg-surface-variant flex-shrink-0 flex items-center justify-center border border-outline-variant/30">
      <Icon name={file.icon!} size={20} className="text-outline" />
    </div>
  );
}

function FileRow({ file, last }: { file: FileItem; last: boolean }) {
  const cfg = statusConfig[file.status];
  const isComplete = file.status === "complete";
  const isExtracting = file.status === "extracting";

  return (
    <div
      className={`flex items-center gap-data-gap p-cell-padding-h transition-colors min-h-[48px] ${
        last ? "" : "border-b border-outline-variant"
      } ${isExtracting ? "bg-surface-container-low hover:bg-surface-container" : "hover:bg-surface-container-low"}`}
    >
      <FileIconCell file={file} />

      <div className="flex-1 min-w-0 pr-4">
        <p className="font-data-tabular text-data-tabular text-on-surface truncate">{file.name}</p>
        <p className="text-on-surface-variant truncate text-[11px] mt-0.5">{file.meta}</p>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 w-32 hidden sm:block">
        <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
          <div
            className={`${cfg.bar} h-full transition-all duration-1000 ease-out`}
            style={{ width: `${file.progress}%` }}
          />
        </div>
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0 w-28 text-right">
        <span
          className={`inline-flex items-center gap-1 font-label-caps text-label-caps px-2 py-1 rounded border ${cfg.badge}`}
        >
          <Icon name={cfg.icon} size={14} className={cfg.iconSpin ? "animate-spin" : ""} />
          {cfg.label}
        </span>
      </div>

      {/* Review action */}
      <div className="flex-shrink-0 w-24 text-right">
        {isComplete ? (
          <button className="font-body-sm text-body-sm text-on-primary bg-primary border border-primary rounded px-3 py-1.5 hover:bg-surface-tint transition-colors shadow-sm font-medium">
            Review
          </button>
        ) : (
          <button
            disabled
            className="font-body-sm text-body-sm text-outline border border-outline-variant/50 rounded px-3 py-1.5 cursor-not-allowed opacity-50 bg-surface-container-highest"
          >
            Review
          </button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const Upload: React.FC = () => {
  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex h-screen overflow-hidden">
      <SideNavBar active="Upload" />
      <div className="flex-1 md:ml-60 flex flex-col h-screen bg-background">
        {/* TopAppBar */}
        <header className="bg-surface/80 backdrop-blur-md sticky top-0 w-full z-40 border-b border-outline-variant flex justify-between items-center h-16 px-container-padding flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-h3 text-h3 text-on-surface">Data Ingestion</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              aria-label="Settings"
              className="text-on-surface-variant hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded-full p-1"
            >
              <Icon name="settings" />
            </button>
            <button
              aria-label="Notifications"
              className="text-on-surface-variant hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded-full p-1"
            >
              <Icon name="notifications" />
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-variant border border-outline-variant overflow-hidden flex items-center justify-center">
              <Icon name="person" className="text-outline" />
            </div>
          </div>
        </header>

        {/* Workbench */}
        <main className="flex-1 overflow-y-auto p-section-margin">
          <div className="max-w-4xl mx-auto space-y-section-margin">
            {/* Header */}
            <div>
              <h2 className="font-h1 text-h1 text-on-surface mb-2">Upload Assets</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Securely ingest raw product images, metadata CSVs, or batch ZIP archives. The
                system will automatically extract and categorize recognized file types.
              </p>
            </div>

            {/* Dropzone */}
            <div className="relative group">
              <div className="border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-lowest p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 hover:border-primary hover:bg-surface-container-low focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                <div className="w-16 h-16 mb-4 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary-container/20 transition-colors">
                  <Icon
                    name="cloud_upload"
                    size={32}
                    className="text-outline group-hover:text-primary transition-colors"
                  />
                </div>
                <h3 className="font-h2 text-h2 text-on-surface mb-2 group-hover:text-primary transition-colors">
                  Drop product images or ZIP files here
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                  Drag and drop your files directly into this area, or{" "}
                  <span className="text-primary font-medium">browse your computer</span>. Supported
                  formats: .zip, .jpg, .png, .csv. Maximum file size: 500MB per batch.
                </p>
                <input
                  aria-label="File upload input"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  multiple
                  type="file"
                />
              </div>
            </div>

            {/* Files in flight */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-h3 text-h3 text-on-surface">Files in flight</h3>
                <span className="font-label-caps text-label-caps bg-surface-variant text-on-surface-variant px-2 py-1 rounded">
                  {files.length} ACTIVE
                </span>
              </div>

              <div className="border border-outline-variant rounded-lg bg-surface-container-lowest overflow-hidden shadow-sm">
                {files.map((file, idx) => (
                  <FileRow key={file.name} file={file} last={idx === files.length - 1} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Upload;
