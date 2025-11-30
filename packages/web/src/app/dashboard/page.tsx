'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function DashboardPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [message, setMessage] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [previewJob, setPreviewJob] = useState<any>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [copySuccess, setCopySuccess] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalUploads: 0,
    totalStorage: 0,
    imageCount: 0,
    videoCount: 0,
    recentActivity: [] as { date: string; count: number }[]
  })

  useEffect(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme')
    setDarkMode(savedTheme === 'dark')
  }, [])

  useEffect(() => {
    // Connect to Socket.io for real-time updates
    const newSocket = io(API_URL, {
      auth: { token }
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to real-time updates')
    })

    newSocket.on('jobStatusUpdate', (data: any) => {
      console.log('📡 Job status update:', data)
      // Update the job in the list
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job._id === data.jobId 
            ? { ...job, status: data.status, thumbnailPath: data.thumbnailPath || job.thumbnailPath }
            : job
        )
      )
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from real-time updates')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [token])

  const toggleTheme = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
  }

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    )
  }

  const selectAllJobs = () => {
    if (selectedJobs.length === jobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(jobs.map(job => job._id))
    }
  }

  const deleteSelectedJobs = async () => {
    if (!confirm(`Delete ${selectedJobs.length} thumbnail(s)?`)) return
    
    try {
      await Promise.all(
        selectedJobs.map(jobId =>
          axios.delete(`${API_URL}/api/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      )
      setMessage(`✅ Deleted ${selectedJobs.length} thumbnail(s)`)
      setSelectedJobs([])
      loadJobs(token)
    } catch (error: any) {
      setMessage(`❌ Delete failed: ${error.message}`)
    }
  }

  const copyThumbnailUrl = (thumbnailPath: string) => {
    const url = `${API_URL}/api/thumbnails/${thumbnailPath.split('/').pop()}`
    navigator.clipboard.writeText(url)
    setCopySuccess(thumbnailPath)
    setTimeout(() => setCopySuccess(''), 2000)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      setSelectedFiles(files)
      setMessage(`✅ Selected ${files.length} file(s). Click Upload to proceed.`)
    }
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      router.push('/')
      return
    }
    setToken(storedToken)
    loadJobs(storedToken)
    getUserInfo(storedToken)
  }, [router])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showUserMenu && !target.closest('[data-user-menu]')) {
        setShowUserMenu(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showUserMenu])

  const getUserInfo = async (authToken: string) => {
    try {
      // Decode JWT to get user email
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      setUserEmail(payload.email || 'User')
    } catch (error) {
      console.error('Error decoding token:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFiles(files)
      setMessage(`✅ Selected ${files.length} file(s). Click Upload to proceed.`)
    }
  }

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setMessage('❌ Please select files first')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setMessage('⏳ Uploading files... Please wait, this may take a moment for large files.')
    
    const formData = new FormData()
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i])
    }

    try {
      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setUploadProgress(percentCompleted)
            setMessage(`⏳ Uploading... ${percentCompleted}%`)
          }
        }
      })
      setMessage(`✅ Uploaded ${res.data.jobs.length} files! Processing thumbnails...`)
      setSelectedFiles(null)
      setUploadProgress(0)
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      setTimeout(() => loadJobs(token), 1000)
    } catch (error: any) {
      console.error('Upload error:', error)
      setMessage(`❌ Upload failed: ${error.response?.data?.message || error.message}`)
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const loadJobs = async (authToken?: string) => {
    const tokenToUse = authToken || token
    if (!tokenToUse) return
    
    setIsRefreshing(true)
    try {
      const res = await axios.get(`${API_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      })
      setJobs(res.data.jobs)
      calculateStats(res.data.jobs)
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        router.push('/')
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  const calculateStats = (jobsList: any[]) => {
    const totalUploads = jobsList.length
    // Calculate total storage - use thumbnailSize if available, otherwise estimate 50KB per thumbnail
    const totalStorage = jobsList.reduce((sum, job) => {
      if (job.thumbnailSize) {
        return sum + job.thumbnailSize
      } else if (job.thumbnailPath) {
        // Estimate 50KB for old thumbnails without size data
        return sum + (50 * 1024)
      }
      return sum
    }, 0)
    const imageCount = jobsList.filter(job => job.fileType === 'image').length
    const videoCount = jobsList.filter(job => job.fileType === 'video').length

    // Calculate activity for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    const activity = last7Days.map(date => {
      const count = jobsList.filter(job => {
        const jobDate = new Date(job.createdAt).toISOString().split('T')[0]
        return jobDate === date
      }).length
      return { date, count }
    })

    setStats({
      totalUploads,
      totalStorage,
      imageCount,
      videoCount,
      recentActivity: activity
    })
  }

  const downloadSelectedThumbnails = async () => {
    const selectedJobsData = jobs.filter(job => 
      selectedJobs.includes(job._id) && job.thumbnailPath
    )
    
    if (selectedJobsData.length === 0) {
      setMessage('❌ No thumbnails to download')
      return
    }

    setMessage(`⏳ Downloading ${selectedJobsData.length} thumbnail(s)...`)
    
    for (const job of selectedJobsData) {
      const url = `${API_URL}/api/download/${job.thumbnailPath.split('/').pop()}`
      const link = document.createElement('a')
      link.href = url
      link.download = `thumb-${job.originalFilename}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay between downloads
    }
    
    setMessage(`✅ Downloaded ${selectedJobsData.length} thumbnail(s)`)
  }

  if (!token) {
    return null
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: darkMode ? '#1f2937' : '#f3f4f6',
      transition: 'background 0.3s ease'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .refreshing {
          animation: blink 0.6s ease-in-out 3;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .nav-title {
            font-size: 18px !important;
          }
          .nav-logo {
            font-size: 22px !important;
          }
          .section-title {
            font-size: 18px !important;
          }
          .user-avatar {
            width: 36px !important;
            height: 36px !important;
            font-size: 14px !important;
          }
          .theme-toggle {
            width: 36px !important;
            height: 36px !important;
            font-size: 18px !important;
          }
          .logout-btn {
            padding: 8px 16px !important;
            font-size: 14px !important;
          }
        }
        
        @media (max-width: 480px) {
          .nav-title {
            font-size: 16px !important;
          }
          .nav-logo {
            font-size: 20px !important;
          }
          .logout-btn {
            padding: 8px 12px !important;
            font-size: 13px !important;
          }
        }
      `}</style>
      <nav style={{ 
        background: darkMode ? '#111827' : 'white', 
        padding: '20px', 
        boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '30px',
        animation: 'slideDown 0.5s ease-out',
        transition: 'background 0.3s ease, box-shadow 0.3s ease'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0 10px'
        }}>
          <h1 className="nav-title" style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: darkMode ? '#818cf8' : '#667eea',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'color 0.3s ease'
          }}>
            <span className="nav-logo" style={{ fontSize: '28px' }}>📸</span>
            SnapThumb
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: darkMode ? '#374151' : '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div style={{ position: 'relative' }} data-user-menu>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="user-avatar"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  textTransform: 'uppercase',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {userEmail ? userEmail.charAt(0).toUpperCase() : '👤'}
              </button>
              
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '50px',
                  right: '0',
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  padding: '15px',
                  minWidth: '200px',
                  zIndex: 1000,
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280', 
                    marginBottom: '5px',
                    fontWeight: '600'
                  }}>
                    Signed in as
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#1f2937',
                    fontWeight: 'bold',
                    wordBreak: 'break-word'
                  }}>
                    {userEmail}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="logout-btn"
              style={{ 
                padding: '10px 20px', 
                background: '#ef4444', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 15px' }}>
        {/* Dashboard Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
          animation: 'fadeInUp 0.5s ease-out'
        }}>
          {/* Total Uploads */}
          <div style={{
            background: darkMode ? '#111827' : 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ fontSize: '14px', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: '8px' }}>
              Total Uploads
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>
              {stats.totalUploads}
            </div>
          </div>

          {/* Total Storage */}
          <div style={{
            background: darkMode ? '#111827' : 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ fontSize: '14px', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: '8px' }}>
              Storage Used
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
              {(stats.totalStorage / 1024).toFixed(2)} KB
            </div>
          </div>

          {/* Most Uploaded Type */}
          <div style={{
            background: darkMode ? '#111827' : 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ fontSize: '14px', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: '8px' }}>
              Most Uploaded
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats.imageCount >= stats.videoCount ? '🖼️ Images' : '🎬 Videos'}
            </div>
            <div style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280', marginTop: '4px' }}>
              {stats.imageCount} images, {stats.videoCount} videos
            </div>
          </div>

          {/* Activity Chart */}
          <div style={{
            background: darkMode ? '#111827' : 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            gridColumn: 'span 1'
          }}>
            <div style={{ fontSize: '14px', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: '12px' }}>
              Last 7 Days
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
              {stats.recentActivity.map((day, index) => {
                const maxCount = Math.max(...stats.recentActivity.map(d => d.count), 1)
                const height = (day.count / maxCount) * 100
                return (
                  <div
                    key={index}
                    title={`${day.date}: ${day.count} uploads`}
                    style={{
                      flex: 1,
                      height: `${height || 5}%`,
                      background: day.count > 0 ? '#667eea' : (darkMode ? '#374151' : '#e5e7eb'),
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {message && (
          <div style={{ 
            background: darkMode 
              ? (message.includes('✅') ? '#065f46' : message.includes('⏳') ? '#92400e' : '#7f1d1d')
              : (message.includes('✅') ? '#d1fae5' : message.includes('⏳') ? '#fef3c7' : '#fee2e2'), 
            padding: '15px', 
            borderRadius: '10px', 
            marginBottom: '20px',
            color: darkMode ? 'white' : (message.includes('✅') ? '#065f46' : message.includes('⏳') ? '#92400e' : '#991b1b'),
            animation: 'fadeInUp 0.4s ease-out',
            transition: 'all 0.3s ease'
          }}>
            {message}
          </div>
        )}

        <div style={{ 
          background: darkMode ? '#111827' : 'white', 
          padding: '30px', 
          borderRadius: '12px', 
          marginBottom: '30px', 
          boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.1)',
          animation: 'fadeInUp 0.6s ease-out',
          transition: 'all 0.3s ease'
        }}>
          <h2 className="section-title" style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            marginBottom: '20px', 
            color: darkMode ? '#f3f4f6' : '#1f2937',
            transition: 'color 0.3s ease'
          }}>
            Upload Files
          </h2>
          
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging 
                ? '3px dashed #667eea' 
                : darkMode ? '2px dashed #4b5563' : '2px dashed #d1d5db',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              background: isDragging 
                ? (darkMode ? '#1f2937' : '#f0f4ff')
                : (darkMode ? '#111827' : '#f9fafb'),
              transition: 'all 0.3s ease',
              marginBottom: '15px'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>
              {isDragging ? '📥' : '📁'}
            </div>
            <p style={{ 
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '15px',
              fontSize: '14px'
            }}>
              {isDragging ? 'Drop files here' : 'Drag & drop files here or click to browse'}
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="file-input"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Browse Files
            </label>
          </div>

          {/* Upload Progress Bar */}
          {uploading && uploadProgress > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: darkMode ? '#374151' : '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <p style={{
                textAlign: 'center',
                marginTop: '5px',
                fontSize: '12px',
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}>
                {uploadProgress}% uploaded
              </p>
            </div>
          )}

          {/* Selected Files & Upload Button */}
          {selectedFiles && selectedFiles.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                flex: 1,
                padding: '10px',
                background: darkMode ? '#1f2937' : '#f3f4f6',
                borderRadius: '8px',
                fontSize: '14px',
                color: darkMode ? '#f3f4f6' : '#1f2937'
              }}>
                {selectedFiles.length} file(s) selected
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{ 
                  padding: '10px 20px', 
                  background: uploading ? '#9ca3af' : '#667eea', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '14px'
                }}
              >
                {uploading ? '⏳ Uploading...' : '📤 Upload'}
              </button>
            </div>
          )}

          {selectedFiles && selectedFiles.length > 0 && (
            <div style={{ 
              marginTop: '15px', 
              padding: '15px', 
              background: '#f9fafb', 
              borderRadius: '8px', 
              fontSize: '14px' 
            }}>
              <strong>Selected files:</strong>
              <ul style={{ margin: '10px 0 0 20px', padding: 0 }}>
                {Array.from(selectedFiles).map((file, index) => (
                  <li key={index} style={{ marginBottom: '5px' }}>
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={{ 
          background: darkMode ? '#111827' : 'white', 
          padding: '30px', 
          borderRadius: '12px', 
          boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.1)',
          animation: 'fadeInUp 0.7s ease-out',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px' 
          }}>
            <h2 className="section-title" style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: darkMode ? '#f3f4f6' : '#1f2937',
              transition: 'color 0.3s ease'
            }}>
              My Thumbnails {jobs.length > 0 && `(${jobs.length})`}
            </h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {jobs.length > 0 && (
                <>
                  <button
                    onClick={selectAllJobs}
                    style={{ 
                      padding: '8px 16px', 
                      background: darkMode ? '#374151' : '#f3f4f6',
                      color: darkMode ? '#f3f4f6' : '#1f2937',
                      border: 'none', 
                      borderRadius: '8px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {selectedJobs.length === jobs.length ? '☑️ Deselect All' : '☐ Select All'}
                  </button>
                  {selectedJobs.length > 0 && (
                    <>
                      <button
                        onClick={downloadSelectedThumbnails}
                        style={{ 
                          padding: '8px 16px', 
                          background: '#10b981',
                          color: 'white',
                          border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        📥 Download ({selectedJobs.length})
                      </button>
                      <button
                        onClick={deleteSelectedJobs}
                        style={{ 
                          padding: '8px 16px', 
                          background: '#ef4444',
                          color: 'white',
                          border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🗑️ Delete ({selectedJobs.length})
                      </button>
                    </>
                  )}
                </>
              )}
              <button
                onClick={() => loadJobs()}
                style={{ 
                  padding: '8px 16px', 
                  background: '#667eea', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>
          
          {jobs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#6b7280' 
            }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>No thumbnails yet</p>
              <p style={{ fontSize: '14px' }}>Upload some images or videos to get started!</p>
            </div>
          ) : (
            <div 
              className={isRefreshing ? 'refreshing' : ''}
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '20px' 
              }}
            >
              {jobs.map((job, index) => (
                <div 
                  key={job._id} 
                  style={{ 
                    border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb', 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    background: darkMode ? '#1f2937' : 'white',
                    transition: 'transform 0.2s, box-shadow 0.2s, background 0.3s ease, border 0.3s ease',
                    animation: `scaleIn 0.5s ease-out ${index * 0.1}s both`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                    e.currentTarget.style.boxShadow = darkMode 
                      ? '0 12px 24px rgba(0,0,0,0.4)' 
                      : '0 12px 24px rgba(102, 126, 234, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ padding: '15px 15px 0 15px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '10px'
                    }}>
                      {/* Checkbox for selection */}
                      <input
                        type="checkbox"
                        checked={selectedJobs.includes(job._id)}
                        onChange={() => toggleJobSelection(job._id)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      />
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ 
                          fontSize: '14px', 
                          color: darkMode ? '#f3f4f6' : '#1f2937',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '5px'
                        }}>
                          {job.originalFilename}
                        </strong>
                        <div style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                          <div>Type: {job.fileType}</div>
                          <div style={{ fontWeight: '600', color: darkMode ? '#d1d5db' : '#4b5563' }}>
                            {job.thumbnailSize 
                              ? `Thumbnail: ${(job.thumbnailSize / 1024).toFixed(2)} KB`
                              : `Original: ${(job.fileSize / 1024 / 1024).toFixed(2)} MB`
                            }
                          </div>
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: job.status === 'completed' ? '#d1fae5' : job.status === 'failed' ? '#fee2e2' : '#fef3c7',
                        color: job.status === 'completed' ? '#065f46' : job.status === 'failed' ? '#991b1b' : '#92400e',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        {job.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {job.thumbnailPath && (
                    <div style={{ padding: '0 15px 15px 15px', overflow: 'hidden' }}>
                      <img 
                        src={`${API_URL}/api/thumbnails/${job.thumbnailPath.split('/').pop()}`}
                        alt="Thumbnail"
                        onClick={() => setPreviewJob(job)}
                        style={{ 
                          width: '100%', 
                          height: '200px', 
                          objectFit: 'contain',
                          background: darkMode ? '#374151' : '#f3f4f6',
                          borderRadius: '8px',
                          transition: 'transform 0.3s ease, filter 0.3s ease',
                          cursor: 'pointer',
                          imageRendering: 'crisp-edges'
                        } as React.CSSProperties}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)'
                          e.currentTarget.style.filter = 'brightness(1.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.filter = 'brightness(1)'
                        }}
                        onError={(e) => { 
                          (e.target as HTMLImageElement).style.display = 'none' 
                        }}
                      />
                    </div>
                  )}
                  
                  <div style={{ padding: '0 15px 15px 15px' }}>
                    {job.thumbnailPath && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => copyThumbnailUrl(job.thumbnailPath)}
                          style={{ 
                            flex: 1,
                            padding: '10px', 
                            background: copySuccess === job.thumbnailPath ? '#10b981' : (darkMode ? '#374151' : '#f3f4f6'),
                            color: copySuccess === job.thumbnailPath ? 'white' : (darkMode ? '#f3f4f6' : '#1f2937'),
                            border: 'none',
                            borderRadius: '8px', 
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {copySuccess === job.thumbnailPath ? '✓ Copied!' : '🔗 Copy URL'}
                        </button>
                        <a
                          href={`${API_URL}/api/download/${job.thumbnailPath.split('/').pop()}`}
                          download
                          style={{ 
                            flex: 1,
                            display: 'block',
                            textAlign: 'center',
                            padding: '10px', 
                            background: '#667eea', 
                            color: 'white', 
                            textDecoration: 'none',
                            borderRadius: '8px', 
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          📥 Download
                        </a>
                      </div>
                    )}
                    {job.errorMessage && (
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '8px',
                        background: '#fee2e2',
                        color: '#991b1b',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        Error: {job.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewJob && (
        <div
          onClick={() => setPreviewJob(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: darkMode ? '#1f2937' : 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            <div style={{
              padding: '20px',
              borderBottom: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                color: darkMode ? '#f3f4f6' : '#1f2937',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                {previewJob.originalFilename}
              </h3>
              <button
                onClick={() => setPreviewJob(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: darkMode ? '#f3f4f6' : '#1f2937',
                  padding: '0 10px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <img
                src={`${API_URL}/api/thumbnails/${previewJob.thumbnailPath.split('/').pop()}`}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
