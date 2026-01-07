import React, { useState, useEffect, useCallback } from 'react';

export interface UseFolder {
  folders: any[];
  loading: boolean;
  error: string | null;
  createFolder: (name: string, color?: string, parentId?: string) => Promise<boolean>;
  updateFolder: (id: string, updates: any) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<boolean>;
  moveFolder: (id: string, newParentId?: string) => Promise<boolean>;
  refreshFolders: () => void;
}

export function useFolders(): UseFolder {
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/folders');
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      
      const data = await response.json();
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const createFolder = useCallback(async (
    name: string, 
    color?: string, 
    parentId?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, parentId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      await fetchFolders(); // Refresh folders
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      return false;
    }
  }, [fetchFolders]);

  const updateFolder = useCallback(async (
    id: string, 
    updates: any
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update folder');
      }

      await fetchFolders(); // Refresh folders
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder');
      return false;
    }
  }, [fetchFolders]);

  const deleteFolder = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete folder');
      }

      await fetchFolders(); // Refresh folders
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
      return false;
    }
  }, [fetchFolders]);

  const moveFolder = useCallback(async (
    id: string, 
    newParentId?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/folders/${id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: newParentId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move folder');
      }

      await fetchFolders(); // Refresh folders
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move folder');
      return false;
    }
  }, [fetchFolders]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    refreshFolders: fetchFolders
  };
}

// Hook untuk videos dengan folder support
export interface UseVideos {
  videos: any[];
  loading: boolean;
  error: string | null;
  moveVideo: (id: string, folderId?: string) => Promise<boolean>;
  deleteVideo: (id: string) => Promise<boolean>;
  refreshVideos: () => void;
}

export function useVideos(currentFolderId?: string): UseVideos {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = currentFolderId 
        ? `/api/videos?folderId=${currentFolderId}`
        : '/api/videos';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      
      const data = await response.json();
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  const moveVideo = useCallback(async (
    id: string, 
    folderId?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/videos/${id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move video');
      }

      await fetchVideos(); // Refresh videos
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move video');
      return false;
    }
  }, [fetchVideos]);

  const deleteVideo = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete video');
      }

      await fetchVideos(); // Refresh videos
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete video');
      return false;
    }
  }, [fetchVideos]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    videos,
    loading,
    error,
    moveVideo,
    deleteVideo,
    refreshVideos: fetchVideos
  };
}

// Hook untuk kombinasi folders dan videos
export function useFolderContent(folderId?: string) {
  const { folders, loading: foldersLoading, error: foldersError, ...folderActions } = useFolders();
  const { videos, loading: videosLoading, error: videosError, ...videoActions } = useVideos(folderId);

  // Filter folders dan videos berdasarkan current folder
  const currentFolders = folders.filter(f => f.parentId === folderId);
  const currentVideos = videos;

  // Get breadcrumb path
  const breadcrumbPath = React.useMemo(() => {
    if (!folderId) return [];
    
    const path: any[] = [];
    let currentId = folderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    
    return path;
  }, [folderId, folders]);

  return {
    // Data
    folders: currentFolders,
    videos: currentVideos,
    allFolders: folders,
    breadcrumbPath,
    
    // Loading states
    loading: foldersLoading || videosLoading,
    foldersLoading,
    videosLoading,
    
    // Error states
    error: foldersError || videosError,
    foldersError,
    videosError,
    
    // Actions
    ...folderActions,
    ...videoActions,
    
    // Refresh all data
    refreshAll: () => {
      folderActions.refreshFolders();
      videoActions.refreshVideos();
    }
  };
}