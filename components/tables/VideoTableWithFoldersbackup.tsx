"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FolderIcon,
  FolderPlusIcon,
  EllipsisVerticalIcon,
  ArrowLeftIcon,
  TrashIcon,
  PencilIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import {
  FolderIcon as FolderSolidIcon,
  VideoCameraIcon as VideoSolidIcon,
} from "@heroicons/react/24/solid";
import { Copy, Check, AlertTriangle, Trash2, FolderX, VideoIcon, Link, X, CheckCircle, Clock, ArrowRight } from "lucide-react";

// ===== Types =====
interface Folder {
  id: string;
  name: string;
  color?: string;
  parentId?: string | null;
  position: number;
  videoCount: number;
  totalEarnings: number;
  createdAt: string;
}

interface Video {
  id: number;
  videoId: string;
  folderId?: string | null;
  earnings: number;
  withdrawnEarnings: number;
  totalViews: number;
  lastViewedAt?: string;
  createdAt: string;
  title?: string;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  details?: string[];
  type: "folder" | "video" | "multiple";
  isForceDelete?: boolean;
}

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, parentId?: string) => void;
  folder?: Folder;
  folders: Folder[];
  currentFolderId?: string;
}

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetFolderId?: string) => void;
  folders: Folder[];
  currentFolderId?: string;
  itemType: "video" | "folder";
  itemName: string;
}

interface RenameVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (title: string) => void;
  currentTitle: string;
}

interface MoveQueueItem {
  id: string;
  name: string;
  type: "video" | "folder";
  status: "pending" | "processing" | "completed" | "failed";
  targetFolder?: string;
  error?: string;
}

interface MoveQueueProgressProps {
  queue: MoveQueueItem[];
  onClose: () => void;
  isVisible: boolean;
}

// ===== Helper: cek folder anak =====
function isDescendant(folderId: string, ancestorId: string, folders: Folder[]): boolean {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder || !folder.parentId) return false;
  if (folder.parentId === ancestorId) return true;
  return isDescendant(folder.parentId, ancestorId, folders);
}

// ===== DeleteConfirmModal =====
const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  type,
  isForceDelete = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "folder":
        return <FolderX className="w-12 h-12 text-red-500" />;
      case "video":
        return <VideoIcon className="w-12 h-12 text-red-500" />;
      default:
        return <Trash2 className="w-12 h-12 text-red-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">{getIcon()}</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

          {isForceDelete && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Peringatan: Aksi ini tidak dapat dibatalkan!
              </span>
            </div>
          )}

          <p className="text-gray-600 mb-4">{message}</p>

          {details && details.length > 0 && (
            <div className="w-full mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Item yang akan dihapus:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {details.map((detail, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium"
            >
              Batal
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-4 py-2 rounded-md font-medium bg-red-600 hover:bg-red-700 text-white"
            >
              {isForceDelete ? "Hapus Paksa" : "Hapus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== FolderModal =====
const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  folder,
  folders,
  currentFolderId,
}) => {
  const [name, setName] = useState(folder?.name || "");
  const [color, setColor] = useState(folder?.color || "#3B82F6");
  const [parentId, setParentId] = useState<string | undefined>(
    folder?.parentId || currentFolderId
  );

  const colors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#F97316", "#06B6D4", "#84CC16"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), color, parentId);
      setName("");
      setColor("#3B82F6");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{folder ? "Edit Folder" : "Create New Folder"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Folder Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter folder name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Parent Folder</label>
            <select
              value={parentId || ""}
              onChange={(e) => setParentId(e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Root Folder</option>
              {folders
                .filter((f) => f.id !== folder?.id && !isDescendant(f.id, folder?.id || "", folders))
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${color === c ? "border-gray-800" : "border-gray-300"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              {folder ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===== MoveModal =====
const MoveModal: React.FC<MoveModalProps> = ({ isOpen, onClose, onMove, folders, currentFolderId, itemType, itemName }) => {
  const [targetFolderId, setTargetFolderId] = useState<string | undefined>();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Move {itemType === "video" ? "Video" : "Folder"}</h3>
        <p className="text-gray-600 mb-4">Moving "{itemName}" to:</p>

        <div className="mb-6">
          <select
            value={targetFolderId || ""}
            onChange={(e) => setTargetFolderId(e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Root Folder</option>
            {folders.filter((f) => f.id !== currentFolderId).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
          <button
            onClick={() => {
              onMove(targetFolderId);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
};

//===== MoveQueueProgress Component =====
const MoveQueueProgress: React.FC<MoveQueueProgressProps> = ({ queue, onClose, isVisible }) => {
  if (!isVisible || queue.length === 0) return null;

  const completedCount = queue.filter(item => item.status === "completed").length;
  const failedCount = queue.filter(item => item.status === "failed").length;
  const processingItem = queue.find(item => item.status === "processing");
  const totalCount = queue.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const getStatusIcon = (status: MoveQueueItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "processing":
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const isCompleted = completedCount + failedCount === totalCount;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 w-80 max-w-[calc(100vw-2rem)] z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium text-gray-900">Moving Files</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>
            {completedCount} of {totalCount} completed
            {failedCount > 0 && ` • ${failedCount} failed`}
          </span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {isCompleted && (
          <div className="mt-2 text-sm text-green-600 font-medium">
            ✓ All files moved successfully
            {failedCount > 0 && ` (${failedCount} failed)`}
          </div>
        )}
      </div>

      {/* Queue Items */}
      <div className="max-h-60 overflow-y-auto">
        {queue.map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0">
            {getStatusIcon(item.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                {item.type === "folder" ? (
                  <FolderIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <VideoIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <span className="truncate font-medium">{item.name}</span>
              </div>
              {item.targetFolder && (
                <div className="text-xs text-gray-500 mt-1">
                  Moving to: {item.targetFolder}
                </div>
              )}
              {item.error && (
                <div className="text-xs text-red-500 mt-1">
                  Error: {item.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Currently Processing */}
      {processingItem && (
        <div className="p-3 bg-blue-50 border-t border-gray-200">
          <div className="text-sm text-blue-800">
            <span className="font-medium">Processing:</span> {processingItem.name}
          </div>
        </div>
      )}
    </div>
  );
};
const RenameVideoModal: React.FC<RenameVideoModalProps> = ({ isOpen, onClose, onRename, currentTitle }) => {
  const [title, setTitle] = useState(currentTitle);

  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Rename Video</h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
          <button onClick={() => onRename(title)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default function VideoTableWithFolders() {
  // ===== State =====
  const [folders, setFolders] = useState<Folder[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  const [editingFolder, setEditingFolder] = useState<Folder | undefined>();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [moveItem, setMoveItem] = useState<{ type: "video" | "folder"; id: string; name: string } | null>(null);

  const [renameVideo, setRenameVideo] = useState<{ id: number; currentTitle: string } | null>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [dragOver, setDragOver] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedFolderId, setCopiedFolderId] = useState<string | null>(null);
  const [copiedAllVideos, setCopiedAllVideos] = useState(false);

  // Move Queue States
  const [moveQueue, setMoveQueue] = useState<MoveQueueItem[]>([]);
  const [showMoveQueue, setShowMoveQueue] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string[];
    type: "folder" | "video" | "multiple";
    isForceDelete?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "folder",
    isForceDelete: false,
    onConfirm: () => {},
  });

  // ===== Breadcrumb Path =====
  const breadcrumbPath = useMemo(() => {
    const path: Folder[] = [];
    let currentId = currentFolderId;

    while (currentId) {
      const folder = folders.find((f) => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId || undefined;
      } else break;
    }
    return path;
  }, [currentFolderId, folders]);

  // Normalize root
  const normalizedCurrentId = currentFolderId ?? null;
  const currentFolders = folders.filter((f) => (f.parentId ?? null) === normalizedCurrentId);

  // ===== Fetch Data =====
  useEffect(() => {
    fetchData();
  }, [currentFolderId, currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [foldersRes, videosRes] = await Promise.all([
        fetch("/api/folders"),
        fetch(`/api/videos?page=${currentPage}&limit=15&folderId=${currentFolderId ?? ""}`),
      ]);

      const foldersData = await foldersRes.json();
      const videosJson = await videosRes.json();

      setFolders(Array.isArray(foldersData) ? foldersData : []);

      const list = Array.isArray(videosJson)
        ? videosJson
        : Array.isArray(videosJson?.data)
        ? videosJson.data
        : [];

      const pages =
        typeof videosJson?.totalPages === "number" && videosJson.totalPages > 0
          ? videosJson.totalPages
          : 1;

      setVideos(list);
      setTotalPages(pages);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data.");
    } finally {
      setLoading(false);
    }
  };

  // ===== Delete Functions =====
  const handleDeleteVideo = async (videoId: number) => {
    try {
      const response = await fetch("/api/video/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: videoId }),
      });

      if (response.ok) {
        toast.success("Video berhasil dihapus!");
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Gagal menghapus video.");
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Gagal menghapus video.");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Folder berhasil dihapus!");
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Gagal menghapus folder.");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Gagal menghapus folder.");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const videoIds = Array.from(selectedItems).filter(id => 
        videos.some(v => v.id.toString() === id)
      );
      const folderIds = Array.from(selectedItems).filter(id => 
        folders.some(f => f.id === id)
      );

      // Delete videos
      for (const videoId of videoIds) {
        await fetch("/api/video/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: parseInt(videoId) }),
        });
      }

      // Delete folders
      for (const folderId of folderIds) {
        await fetch(`/api/folders/${folderId}`, {
          method: "DELETE",
        });
      }

      toast.success(`${selectedItems.size} item berhasil dihapus!`);
      setSelectedItems(new Set());
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("Gagal menghapus beberapa item.");
    }
  };

  // ===== Folder Handlers =====
  const handleCreateFolder = async (name: string, color: string, parentId?: string) => {
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          color,
          parentId: parentId || currentFolderId,
        }),
      });

      if (response.ok) {
        toast.success("Folder berhasil dibuat!");
        fetchData();
      } else {
        toast.error("Gagal membuat folder.");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Gagal membuat folder.");
    }
  };

  const handleEditFolder = async (name: string, color: string, parentId?: string) => {
    if (!editingFolder) return;

    try {
      const response = await fetch(`/api/folders/${editingFolder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, parentId }),
      });

      if (response.ok) {
        toast.success("Folder berhasil diupdate!");
        fetchData();
      } else {
        toast.error("Gagal update folder.");
      }
    } catch (error) {
      console.error("Error updating folder:", error);
      toast.error("Gagal update folder.");
    }
  };

  // ===== Video Rename =====
  const handleRenameVideo = async (newTitle: string) => {
    if (!renameVideo) return;

    try {
      const response = await fetch(`/api/video/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: renameVideo.id, newName: newTitle }),
      });

      if (response.ok) {
        toast.success("Video berhasil di-rename!");
        fetchData();
      } else {
        toast.error("Gagal rename video.");
      }
    } catch (error) {
      console.error("Error renaming video:", error);
      toast.error("Gagal rename video.");
    } finally {
      setShowRenameModal(false);
      setRenameVideo(null);
    }
  };

  // ===== Move Items with Queue =====
  const processMove = async (item: MoveQueueItem, targetFolderId?: string) => {
    // Update item status to processing
    setMoveQueue(prev => prev.map(queueItem => 
      queueItem.id === item.id && queueItem.type === item.type
        ? { ...queueItem, status: "processing" }
        : queueItem
    ));

    try {
      const endpoint = item.type === "folder"
        ? `/api/folders/${item.id}/move`
        : `/api/videos/${item.id}/move`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetFolderId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to move ${item.type}`);
      }

      // Update item status to completed
      setMoveQueue(prev => prev.map(queueItem => 
        queueItem.id === item.id && queueItem.type === item.type
          ? { ...queueItem, status: "completed" }
          : queueItem
      ));
    } catch (error) {
      // Update item status to failed
      setMoveQueue(prev => prev.map(queueItem => 
        queueItem.id === item.id && queueItem.type === item.type
          ? { 
              ...queueItem, 
              status: "failed", 
              error: error instanceof Error ? error.message : "Unknown error" 
            }
          : queueItem
      ));
    }
  };

  const handleMoveItems = async (targetFolderId?: string) => {
    const targetFolderName = targetFolderId 
      ? folders.find(f => f.id === targetFolderId)?.name || "Unknown Folder"
      : "Root";

    try {
      let itemsToMove: MoveQueueItem[] = [];

      // Single move
      if (moveItem) {
        itemsToMove = [{
          id: moveItem.id,
          name: moveItem.name,
          type: moveItem.type,
          status: "pending",
          targetFolder: targetFolderName
        }];
      } else {
        // Multi move
        itemsToMove = Array.from(selectedItems).map(id => {
          const folder = folders.find(f => f.id === id);
          const video = videos.find(v => v.id.toString() === id);
          
          if (folder) {
            return {
              id: folder.id,
              name: folder.name,
              type: "folder" as const,
              status: "pending" as const,
              targetFolder: targetFolderName
            } as MoveQueueItem;
          } else if (video) {
            return {
              id: video.id.toString(),
              name: video.title || video.videoId,
              type: "video" as const,
              status: "pending" as const,
              targetFolder: targetFolderName
            } as MoveQueueItem;
          }
          return null;
        }).filter((item): item is MoveQueueItem => item !== null);
      }

      if (itemsToMove.length === 0) {
        toast.error("No items to move");
        return;
      }

      // Initialize queue and show progress
      setMoveQueue(itemsToMove);
      setShowMoveQueue(true);

      // Process items sequentially
      for (const item of itemsToMove) {
        await processMove(item, targetFolderId);
        // Add small delay between moves to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Check if all completed successfully
      const completedCount = itemsToMove.length;
      const failedItems = moveQueue.filter(item => item.status === "failed");
      
      if (failedItems.length === 0) {
        toast.success(`Successfully moved ${completedCount} item(s)!`);
      } else {
        toast.error(`Moved ${completedCount - failedItems.length} items, ${failedItems.length} failed`);
      }

      // Clean up
      setSelectedItems(new Set());
      setMoveItem(null);
      fetchData();

      // Auto-hide queue after completion (with delay to show final status)
      setTimeout(() => {
        setShowMoveQueue(false);
        setMoveQueue([]);
      }, 3000);

    } catch (error) {
      console.error("Error moving items:", error);
      toast.error("Gagal memindahkan item.");
      setShowMoveQueue(false);
      setMoveQueue([]);
    }
  };

  // ===== Copy Link =====
  const handleCopyLink = async (videoId: string, id: number) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    const link = `${baseUrl}/v?id=${videoId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Link berhasil disalin!");
    } catch {
      toast.error("Gagal menyalin link.");
    }
  };

  // ===== Copy All Video Links =====
  const handleCopyAllVideoLinks = async () => {
    if (videos.length === 0) {
      toast.error("Tidak ada video untuk disalin linknya.");
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    const links = videos.map(video => `${baseUrl}/v?id=${video.videoId}`).join('\n');
    
    try {
      await navigator.clipboard.writeText(links);
      setCopiedAllVideos(true);
      setTimeout(() => setCopiedAllVideos(false), 2000);
      
      const contextText = currentFolderId 
        ? `folder "${breadcrumbPath[breadcrumbPath.length - 1]?.name || 'ini'}"` 
        : "root";
      toast.success(`${videos.length} link video dari ${contextText} berhasil disalin!`);
    } catch {
      toast.error("Gagal menyalin link video.");
    }
  };

  const handleCopyFolderLink = async (folderId: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    const link = `${baseUrl}/f?id=${folderId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedFolderId(folderId);
      setTimeout(() => setCopiedFolderId(null), 2000);
      toast.success("Link folder berhasil disalin!");
    } catch {
      toast.error("Gagal menyalin link folder.");
    }
  };

  // ===== Drag & Drop =====
  const handleDragStart = (e: React.DragEvent, id: string, type: "folder" | "video") => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id, type }));
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOver(folderId);
  };

  const handleDragLeave = () => setDragOver(null);

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragOver(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const endpoint =
        data.type === "folder" ? `/api/folders/${data.id}/move` : `/api/videos/${data.id}/move`;

      await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetFolderId }),
      });

      fetchData();
    } catch (error) {
      console.error("Error moving item:", error);
      toast.error("Gagal memindahkan item.");
    }
  };

    // ===== Helper =====
  const formatEarnings = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    })
      .format(amount)
      .replace(/^US\$/, "$");

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ====== Loading Skeleton ======
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ====== Render ======
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-xl font-semibold text-gray-900">My Videos</h2>
          <div className="flex flex-wrap gap-2">
            {/* Copy All Video Links Button */}
            {videos.length > 0 && (
              <button
                onClick={handleCopyAllVideoLinks}
                className="flex items-center gap-1 px-2 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-xs sm:text-sm"
                title={`Copy all video links from ${currentFolderId ? 'this folder' : 'root'}`}
              >
                {copiedAllVideos ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Copy All Videos ({videos.length})</span>
                <span className="sm:hidden">Copy All ({videos.length})</span>
              </button>
            )}
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="px-2 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">{viewMode === "grid" ? "List" : "Grid"} View</span>
              <span className="sm:hidden">{viewMode === "grid" ? "List" : "Grid"}</span>
            </button>
            <button
              onClick={() => {
                setShowFolderModal(true);
                setEditingFolder(undefined);
              }}
              className="flex items-center gap-1 px-2 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs sm:text-sm"
            >
              <FolderPlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">New Folder</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button
            onClick={() => {
              setCurrentFolderId(undefined);
              setCurrentPage(1);
            }}
            className="hover:text-blue-600"
          >
            Root
          </button>
          {breadcrumbPath.map((folder) => (
            <React.Fragment key={folder.id}>
              <span>/</span>
              <button
                onClick={() => {
                  setCurrentFolderId(folder.id);
                  setCurrentPage(1);
                }}
                className="hover:text-blue-600"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Actions Bar */}
        {selectedItems.size > 0 && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-md">
            <span className="text-sm text-blue-800">{selectedItems.size} item(s) selected</span>
            <button
              onClick={() => setShowMoveModal(true)}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Move
            </button>
            <button
              onClick={() =>
                setDeleteModal({
                  isOpen: true,
                  title: "Hapus Item Terpilih",
                  message: `Apakah Anda yakin ingin menghapus ${selectedItems.size} item terpilih?`,
                  type: "multiple",
                  onConfirm: handleBulkDelete,
                })
              }
              className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {currentFolderId && (
          <button
            onClick={() => {
              const parentFolder = folders.find((f) => f.id === currentFolderId);
              setCurrentFolderId(parentFolder?.parentId || undefined);
              setCurrentPage(1);
            }}
            className="flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Parent Folder
          </button>
        )}

        {/* List View */}
        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 w-8">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = new Set([
                            ...currentFolders.map((f) => f.id),
                            ...videos.map((v) => v.id.toString()),
                          ]);
                          setSelectedItems(allIds);
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="text-left py-2 px-2 min-w-[120px]">Name</th>
                  <th className="text-left py-2 px-2 hidden sm:table-cell">Type</th>
                  <th className="text-left py-2 px-2 text-xs sm:text-sm">Views</th>
                  <th className="text-left py-2 px-2 text-xs sm:text-sm">Earnings</th>
                  <th className="text-left py-2 px-2 hidden md:table-cell">Created</th>
                  <th className="text-left py-2 px-2 w-20 sm:w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Folders */}
                {currentFolders.map((folder) => (
                  <tr
                    key={folder.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      dragOver === folder.id ? "bg-blue-50" : ""
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, folder.id, "folder")}
                    onDragOver={(e) => handleDragOver(e, folder.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.id)}
                  >
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(folder.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedItems);
                          if (e.target.checked) newSelected.add(folder.id);
                          else newSelected.delete(folder.id);
                          setSelectedItems(newSelected);
                        }}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => {
                          setCurrentFolderId(folder.id);
                          setCurrentPage(1);
                        }}
                        className="flex items-center gap-2 hover:text-blue-600 min-w-0 w-full"
                      >
                        <FolderSolidIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: folder.color }} />
                        <span className="text-sm break-words">{folder.name}</span>
                      </button>
                    </td>
                    <td className="py-2 px-2 text-gray-600 text-xs sm:text-sm hidden sm:table-cell">Folder</td>
                    <td className="py-2 px-2 text-xs sm:text-sm">
                      <span className="sm:hidden">{folder.videoCount}</span>
                      <span className="hidden sm:inline">{folder.videoCount} videos</span>
                    </td>
                    <td className="py-2 px-2 text-xs sm:text-sm">{formatEarnings(folder.totalEarnings)}</td>
                    <td className="py-2 px-2 text-gray-600 text-xs hidden md:table-cell">{formatDate(folder.createdAt)}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingFolder(folder);
                            setShowFolderModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Edit"
                        >
                          <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleCopyFolderLink(folder.id)}
                          className="p-1 hover:bg-gray-200 rounded text-blue-600"
                          title="Copy Folder Link"
                        >
                          {copiedFolderId === folder.id ? (
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModal({
                              isOpen: true,
                              title: "Hapus Folder",
                              message: `Apakah Anda yakin ingin menghapus folder "${folder.name}"?`,
                              details: folder.videoCount > 0 ? [`${folder.videoCount} video di dalam folder ini akan ikut terhapus`] : undefined,
                              type: "folder",
                              isForceDelete: folder.videoCount > 0,
                              onConfirm: () => handleDeleteFolder(folder.id),
                            })
                          }
                          className="p-1 hover:bg-gray-200 rounded text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Videos */}
                {videos.map((video) => (
                  <tr
                    key={video.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                    draggable
                    onDragStart={(e) => handleDragStart(e, video.id.toString(), "video")}
                  >
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(video.id.toString())}
                        onChange={(e) => {
                          const newSelected = new Set(selectedItems);
                          if (e.target.checked) newSelected.add(video.id.toString());
                          else newSelected.delete(video.id.toString());
                          setSelectedItems(newSelected);
                        }}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <VideoSolidIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm break-words leading-tight">{video.title || video.videoId}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-gray-600 text-xs sm:text-sm hidden sm:table-cell">Video</td>
                    <td className="py-2 px-2 text-xs sm:text-sm">
                      <span className="sm:hidden">{(video.totalViews / 1000).toFixed(0)}</span>
                      <span className="hidden sm:inline">{video.totalViews.toLocaleString()} views</span>
                    </td>
                    <td className="py-2 px-2 text-xs sm:text-sm">{formatEarnings(video.earnings)}</td>
                    <td className="py-2 px-2 text-gray-600 text-xs hidden md:table-cell">{formatDate(video.createdAt)}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyLink(video.videoId, video.id)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Copy Link"
                        >
                          {copiedId === video.id ? (
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setRenameVideo({ id: video.id, currentTitle: video.title || video.videoId });
                            setShowRenameModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-700 hidden sm:block"
                          title="Rename"
                        >
                          <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setMoveItem({ type: "video", id: video.id.toString(), name: video.title || video.videoId });
                            setShowMoveModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-blue-600 hidden sm:block"
                          title="Move"
                        >
                          <ArrowUpTrayIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModal({
                              isOpen: true,
                              title: "Hapus Video",
                              message: `Apakah Anda yakin ingin menghapus video "${video.title || video.videoId}"?`,
                              type: "video",
                              onConfirm: () => handleDeleteVideo(video.id),
                            })
                          }
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete"
                        >
                          <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {/* Grid View */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Folders */}
              {currentFolders.map((folder) => (
                <div
                  key={folder.id}
                  className={`group relative border rounded-xl p-4 hover:shadow-sm transition
                    ${selectedItems.has(folder.id) ? "ring-2 ring-blue-500" : "border-gray-200"}
                    ${dragOver === folder.id ? "bg-blue-50 border-blue-300" : "bg-white"}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, folder.id, "folder")}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                >
                  {/* Select checkbox */}
                  <div className="absolute top-3 left-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(folder.id)}
                      onChange={(e) => {
                        const next = new Set(selectedItems);
                        if (e.target.checked) next.add(folder.id);
                        else next.delete(folder.id);
                        setSelectedItems(next);
                      }}
                    />
                  </div>

                  {/* Open folder */}
                  <button
                    onClick={() => {
                      setCurrentFolderId(folder.id);
                      setCurrentPage(1);
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FolderSolidIcon className="w-10 h-10 flex-shrink-0" style={{ color: folder.color }} />
                      <div className="min-w-0">
                        <div className="font-medium break-words text-sm leading-tight">{folder.name}</div>
                        <div className="text-xs text-gray-500">{folder.videoCount} videos</div>
                      </div>
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-500">{new Date(folder.createdAt).toLocaleDateString("id-ID")}</div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder);
                          setShowFolderModal(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit folder"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyFolderLink(folder.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        title="Copy folder link"
                      >
                        {copiedFolderId === folder.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoveItem({ type: "folder", id: folder.id, name: folder.name });
                          setShowMoveModal(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Move"
                      >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({
                            isOpen: true,
                            title: "Hapus Folder",
                            message: `Apakah Anda yakin ingin menghapus folder "${folder.name}"?`,
                            details: folder.videoCount > 0 ? [`${folder.videoCount} video di dalam folder ini akan ikut terhapus`] : undefined,
                            type: "folder",
                            isForceDelete: folder.videoCount > 0,
                            onConfirm: () => handleDeleteFolder(folder.id),
                          });
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-red-600"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Videos */}
              {videos.map((video) => (
                <div
                  key={video.id}
                  className={`group relative border rounded-xl p-4 hover:shadow-sm transition
                    ${selectedItems.has(video.id.toString()) ? "ring-2 ring-blue-500" : "border-gray-200"} bg-white`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, video.id.toString(), "video")}
                >
                  {/* Select checkbox */}
                  <div className="absolute top-3 left-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(video.id.toString())}
                      onChange={(e) => {
                        const next = new Set(selectedItems);
                        if (e.target.checked) next.add(video.id.toString());
                        else next.delete(video.id.toString());
                        setSelectedItems(next);
                      }}
                    />
                  </div>

                  <div className="w-full h-28 rounded-lg mb-3 bg-gray-50 flex items-center justify-center">
                    <VideoSolidIcon className="w-8 h-8 text-red-500" />
                  </div>

                  <div className="min-w-0">
                    <div className="font-medium break-words text-sm leading-tight">{video.title || video.videoId}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {video.totalViews.toLocaleString()} views • {new Date(video.createdAt).toLocaleDateString("id-ID")}
                    </div>
                    <div className="mt-1 text-xs text-green-600">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
                        .format(video.earnings)
                        .replace(/^US\$/, "$")}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleCopyLink(video.videoId, video.id)}
                      className="p-1 hover:bg-gray-100 rounded text-blue-600"
                      title="Copy Link"
                    >
                      {copiedId === video.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setRenameVideo({ id: video.id, currentTitle: video.title || video.videoId });
                        setShowRenameModal(true);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Rename"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setMoveItem({ type: "video", id: video.id.toString(), name: video.title || video.videoId });
                        setShowMoveModal(true);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Move"
                    >
                      <ArrowUpTrayIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteModal({
                          isOpen: true,
                          title: "Hapus Video",
                          message: `Apakah Anda yakin ingin menghapus video "${video.title || video.videoId}"?`,
                          type: "video",
                          onConfirm: () => handleDeleteVideo(video.id),
                        })
                      }
                      className="p-1 hover:bg-gray-100 rounded text-red-600"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-5 gap-1 pb-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-40"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-2.5 py-1.5 text-xs rounded-md border ${
                  currentPage === i + 1
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <DeleteConfirmModal {...deleteModal} onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })} />
      <FolderModal
        isOpen={showFolderModal}
        onClose={() => {
          setShowFolderModal(false);
          setEditingFolder(undefined);
        }}
        onSave={editingFolder ? handleEditFolder : handleCreateFolder}
        folder={editingFolder}
        folders={folders}
        currentFolderId={currentFolderId}
      />
      <MoveModal
        isOpen={showMoveModal}
        onClose={() => {
          setShowMoveModal(false);
          setMoveItem(null);
        }}
        onMove={handleMoveItems}
        folders={folders}
        currentFolderId={currentFolderId}
        itemType={moveItem?.type || "video"}
        itemName={moveItem?.name || ""}
      />
      <RenameVideoModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        onRename={handleRenameVideo}
        currentTitle={renameVideo?.currentTitle || ""}
      />

      {/* Move Queue Progress */}
      <MoveQueueProgress
        queue={moveQueue}
        onClose={() => {
          setShowMoveQueue(false);
          setMoveQueue([]);
        }}
        isVisible={showMoveQueue}
      />
    </div>
  );
}