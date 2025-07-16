import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle, Edit, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // <-- UNCOMMENTED
import { useAuth } from '@/components/auth/AuthProvider'; // <-- UNCOMMENTED
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at: string;
  project_id?: string;
  // New fields for Google Tasks integration
  isGoogleTask?: boolean;
  googleTaskId?: string;
  googleTaskListId?: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface GoogleTaskList {
  id: string;
  title: string;
}

const priorityOrder = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};

// --- Google API Constants ---
const GOOGLE_CLIENT_ID_FOR_TESTING = '567276569908-c1cd5rev7evd0ikmhki88ggf8e016v77.apps.googleusercontent.com'; // <--- REPLACE THIS WITH YOUR ACTUAL CLIENT ID
const GOOGLE_REDIRECT_URI = window.location.origin;
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/tasks';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_URGENT_INDICATOR = '⭐ Urgent'; // Prefix for notes to indicate urgency

// Session Storage Key for Google Token
const GOOGLE_ACCESS_TOKEN_KEY = 'google_tasks_access_token';

export const Tasks = () => {
  const { user } = useAuth(); // Get user from AuthProvider
  const [tasks, setTasks] = useState<Task[]>([]); // This will hold your local Supabase tasks
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Corrected type for priority
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortByDate, setSortByDate] = useState<boolean>(false);

  // Google Tasks States
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isSignedInGoogle, setIsSignedInGoogle] = useState(false);
  const [googleTaskLists, setGoogleTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedGoogleTaskListId, setSelectedGoogleTaskListId] = useState<string | null>(null);
  const [googleTasks, setGoogleTasks] = useState<Task[]>([]);

  // --- Google Authentication Logic ---
  const handleGoogleSignIn = () => {
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID_FOR_TESTING);
    authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', GOOGLE_SCOPES);
    authUrl.searchParams.append('include_granted_scopes', 'true');
    authUrl.searchParams.append('state', 'google_tasks_auth');
    authUrl.searchParams.append('prompt', 'select_account');

    window.location.href = authUrl.toString();
  };

  const handleGoogleSignOut = () => {
    setGoogleAccessToken(null);
    setIsSignedInGoogle(false);
    setGoogleTaskLists([]);
    setSelectedGoogleTaskListId(null);
    setGoogleTasks([]);
    sessionStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY); // Clear token from session storage
    toast.info('Signed out from Google Tasks.');
  };

  // Effect to handle the OAuth redirect callback from Google AND load token from sessionStorage
  useEffect(() => {
    console.log('--- OAuth/Session Storage Effect Running (Tasks.tsx) ---');
    console.log('Current URL Hash (Tasks.tsx):', window.location.hash);

    const params = new URLSearchParams(window.location.hash.substring(1));
    const tokenFromHash = params.get('access_token');
    const stateFromHash = params.get('state');

    if (tokenFromHash && stateFromHash === 'google_tasks_auth') {
      console.log('Tasks.tsx: Access token and state found in hash.');
      setGoogleAccessToken(tokenFromHash);
      setIsSignedInGoogle(true);
      sessionStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, tokenFromHash); // Store for future sessions
      window.history.replaceState({}, document.title, window.location.pathname); // Clear the hash
      toast.success('Successfully connected to Google Tasks!');
    } else {
      console.log('Tasks.tsx: No valid access token or state found directly in hash.');

      const storedToken = sessionStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
      console.log('Tasks.tsx: Token from sessionStorage:', storedToken ? 'Found' : 'Not Found');
      if (storedToken) {
        console.log('Tasks.tsx: Access token found in session storage. Using stored token.');
        setGoogleAccessToken(storedToken);
        setIsSignedInGoogle(true);
        toast.success('Successfully reconnected to Google Tasks from session storage!');
      } else {
        console.log('Tasks.tsx: No access token found in session storage. User is NOT signed into Google Tasks.');
        setIsSignedInGoogle(false);
      }
    }
    console.log('--- OAuth/Session Storage Effect Finished (Tasks.tsx) ---');
  }, []);

  // --- Google Tasks API Calls ---
  const googleApiFetch = useCallback(async (endpoint: string, options?: RequestInit) => {
    if (!googleAccessToken) {
      throw new Error('Google access token is missing. Please sign in to Google Tasks.');
    }
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/${endpoint}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${googleAccessToken}`,
        'Content-Type': options?.method === 'POST' || options?.method === 'PATCH' ? 'application/json' : undefined,
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        handleGoogleSignOut();
        toast.error('Google session expired. Please re-authenticate.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Google API Error: ${response.statusText}`);
    }
    return response.json();
  }, [googleAccessToken]);

  const fetchGoogleTaskLists = useCallback(async () => {
    console.log('Attempting to fetch Google Task lists. isSignedInGoogle:', isSignedInGoogle);
    if (isSignedInGoogle) {
      try {
        const data = await googleApiFetch('users/@me/lists');
        setGoogleTaskLists(data.items || []);
        if (data.items.length > 0 && !selectedGoogleTaskListId) {
          const myTasksList = data.items.find((list: GoogleTaskList) => list.title === 'My Tasks');
          setSelectedGoogleTaskListId(myTasksList ? myTasksList.id : data.items[0].id);
        } else if (data.items.length === 0) {
          setSelectedGoogleTaskListId(null);
        }
      } catch (error: any) {
        toast.error(`Failed to fetch Google Task lists: ${error.message}`);
        console.error('Google Task List fetch error:', error);
        setSelectedGoogleTaskListId(null);
        setGoogleTaskLists([]);
      }
    } else {
      setGoogleTaskLists([]);
      setSelectedGoogleTaskListId(null);
    }
  }, [isSignedInGoogle, selectedGoogleTaskListId, googleApiFetch]);

  const fetchGoogleTasks = useCallback(async () => {
    console.log('Attempting to fetch Google Tasks. selectedGoogleTaskListId:', selectedGoogleTaskListId, 'isSignedInGoogle:', isSignedInGoogle);
    if (selectedGoogleTaskListId && isSignedInGoogle) {
      try {
        const data = await googleApiFetch(`lists/${selectedGoogleTaskListId}/tasks?showCompleted=true&showHidden=true`);
        const mappedTasks: Task[] = (data.items || []).map((gt: any) => {
          let descriptionNotes = gt.notes || '';
          let taskPriority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

          if (descriptionNotes.startsWith(GOOGLE_URGENT_INDICATOR)) {
            taskPriority = 'urgent';
            descriptionNotes = descriptionNotes.substring(GOOGLE_URGENT_INDICATOR.length).trim();
          }

          return {
            id: gt.id,
            title: gt.title,
            description: descriptionNotes,
            status: gt.status === 'completed' ? 'completed' : 'pending',
            priority: taskPriority,
            due_date: gt.due,
            created_at: gt.updated,
            isGoogleTask: true,
            googleTaskId: gt.id,
            googleTaskListId: selectedGoogleTaskListId,
            project_id: undefined,
          };
        });
        setGoogleTasks(mappedTasks);
      } catch (error: any) {
        toast.error(`Failed to fetch Google Tasks: ${error.message}`);
        console.error('Google Tasks fetch error:', error);
        setGoogleTasks([]);
      }
    } else {
      setGoogleTasks([]);
    }
  }, [selectedGoogleTaskListId, isSignedInGoogle, googleApiFetch]);

  // --- Local Supabase Functions ---
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id) // Ensure tasks are fetched for the current user
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast.error(`Failed to fetch local tasks: ${error.message}`);
      console.error('Supabase fetch tasks error:', error);
    }
  }, [user]);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id) // Fetch projects for the current user
        .order('name', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error(`Failed to fetch projects: ${error.message}`);
      console.error('Supabase fetch projects error:', error);
    }
  }, [user]);

  const createLocalTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'isGoogleTask' | 'googleTaskId' | 'googleTaskListId'>) => {
    if (!user) {
      toast.error('You must be logged in to create a local task.');
      return null;
    }
    try {
      // The `Omit` type in the function signature correctly removes 'created_at' for the input payload.
      // However, when inserting into Supabase, `created_at` is typically automatically managed.
      // We explicitly remove it from the object we pass to Supabase to avoid sending it.
      const { data, error } = await supabase.from('tasks').insert([{
        ...taskData,
        user_id: user.id // Associate task with the logged-in user
      }]).select();
      if (error) throw error;
      toast.success('Local Task created!');
      return data[0];
    } catch (error: any) {
      toast.error(`Failed to create local task: ${error.message}`);
      console.error('Supabase create task error:', error);
      return null;
    }
  };

  const updateLocalTask = async (taskId: string, taskData: Partial<Task>) => {
    if (!user) {
      toast.error('You must be logged in to update a local task.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', taskId)
        .eq('user_id', user.id) // Ensure user can only update their own tasks
        .select();
      if (error) throw error;
      toast.success('Local Task updated!');
      return data[0];
    } catch (error: any) {
      toast.error(`Failed to update local task: ${error.message}`);
      console.error('Supabase update task error:', error);
      return null;
    }
  };

  const deleteLocalTask = async (taskId: string) => {
    if (!user) {
      toast.error('You must be logged in to delete a local task.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id); // Ensure user can only delete their own tasks
      if (error) throw error;
      toast.success('Local Task deleted!');
    } catch (error: any) {
      toast.error(`Failed to delete local task: ${error.message}`);
      console.error('Supabase delete task error:', error);
    }
  };

  // --- Syncing Logic ---
  const handleLocalSync = async () => {
    toast.info('Initiating local and Google Task synchronization.');
    // In a real scenario, this would involve:
    // 1. Fetching all local Supabase tasks.
    // 2. Fetching all Google Tasks from the selected list.
    // 3. Comparing and reconciling tasks (e.g., based on creation date, last updated, a unique sync ID if possible).
    //    - Tasks in Google but not Supabase -> Create in Supabase (if desired).
    //    - Tasks in Supabase but not Google -> Create in Google (if desired).
    //    - Tasks in both, but one is more recent -> Update the older one.
    //    - Handling conflicts (e.g., showing a merge UI or applying a "last write wins" strategy).

    // For this example, we'll just re-fetch both, simulating a "refresh" sync.
    await fetchTasks();
    if (isSignedInGoogle) {
      await fetchGoogleTasks();
    }
    toast.success('Synchronization complete!');
  };

  // --- Effects for Data Fetching ---
  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  useEffect(() => {
    fetchGoogleTaskLists();
  }, [fetchGoogleTaskLists]);

  useEffect(() => {
    fetchGoogleTasks();
  }, [fetchGoogleTasks]);

  // --- Form Submission Logic (Handles both Local and Google Tasks) ---
 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const baseTaskData = {
    title,
    description: description || null,
    priority,
    due_date: dueDate || null,
  };

  // Log to see current state (this is fine)
  console.log('handleSubmit called.');
  console.log('editingTask:', editingTask); // This should be the temp object for new tasks
  console.log('selectedGoogleTaskListId:', selectedGoogleTaskListId);
  console.log('isSignedInGoogle:', isSignedInGoogle);
  // console.log('Is Google Task creation intent (from button click)?', showGoogleTaskForm); // REMOVE THIS LINE

  // If editing an existing task (and not the temp new task)
  if (editingTask && editingTask.id !== 'new-google-task-temp') {
    if (editingTask.isGoogleTask) {
      if (!googleAccessToken || !editingTask.googleTaskListId || !editingTask.googleTaskId) {
        toast.error('Google Tasks API not available or task ID missing (for update).');
        return;
      }
      try {
        const googleTaskPayload = {
          title,
          notes: priority === 'urgent' ? GOOGLE_URGENT_INDICATOR + (description ? `\n${description}` : '') : description,
          due: dueDate ? new Date(dueDate).toISOString() : undefined,
          status: editingTask.status === 'completed' ? 'completed' : 'needsAction',
        };
        await googleApiFetch(`lists/${editingTask.googleTaskListId}/tasks/${editingTask.googleTaskId}`, {
          method: 'PATCH',
          body: JSON.stringify(googleTaskPayload),
        });
        toast.success('Google Task updated!');
        resetForm();
        fetchGoogleTasks();
      } catch (error: any) {
        toast.error(`Failed to update Google Task: ${error.message}`);
        console.error('Google Task update error:', error);
      }
    } else {
      // Handle local task update
      await updateLocalTask(editingTask.id, { ...baseTaskData, project_id: projectId || null });
      resetForm();
      fetchTasks();
    }
  } else { // This block is for creating a NEW task (whether local or Google)
    // This is the correct condition for a NEW Google Task,
    // as `editingTask` would be the temporary object with `new-google-task-temp` id.
    if (editingTask && editingTask.id === 'new-google-task-temp' && editingTask.isGoogleTask) {
        if (!selectedGoogleTaskListId || !isSignedInGoogle) {
            toast.error('Please connect to Google Tasks and select a list to create a new Google task.');
            return;
        }
        try {
            const googleTaskPayload = {
                title,
                notes: priority === 'urgent' ? GOOGLE_URGENT_INDICATOR + (description ? `\n${description}` : '') : description,
                due: dueDate ? new Date(dueDate).toISOString() : undefined,
                status: 'needsAction', // New tasks are pending
            };
            await googleApiFetch(`lists/${selectedGoogleTaskListId}/tasks`, {
                method: 'POST',
                body: JSON.stringify(googleTaskPayload),
            });
            toast.success('Google Task created!');
            resetForm();
            fetchGoogleTasks();
        } catch (error: any) {
            toast.error(`Failed to create Google Task: ${error.message}`);
            console.error('Google Task creation error:', error);
        }
    } else { // This is for NEW Local Tasks (if `editingTask` is null, or not a temp google task)
      await createLocalTask({ ...baseTaskData, status: 'pending', project_id: projectId || null });
      resetForm();
      fetchTasks();
    }
  }
};
  const handleCreateGoogleTask = () => {
    if (!isSignedInGoogle || !selectedGoogleTaskListId) {
      toast.error('Please connect to Google Tasks and select a list first to create a Google task.');
      return;
    }
    setShowForm(true);
    setEditingTask({
      id: 'new-google-task-temp', // Temporary ID for new task form
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      created_at: new Date().toISOString(), // This 'created_at' is for UI consistency before saving
      isGoogleTask: true,
      googleTaskListId: selectedGoogleTaskListId,
      googleTaskId: undefined, // No Google Task ID yet
    });
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setProjectId('');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setProjectId('');
    setShowForm(false);
    setEditingTask(null);
  };

  const toggleTaskStatus = async (task: Task) => {
    if (task.isGoogleTask) {
      if (!googleAccessToken || !task.googleTaskListId || !task.googleTaskId) {
        toast.error('Google Tasks API not available or task ID missing.');
        return;
      }
      const newGoogleStatus = task.status === 'completed' ? 'needsAction' : 'completed';
      try {
        await googleApiFetch(`lists/${task.googleTaskListId}/tasks/${task.googleTaskId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newGoogleStatus }),
        });
        toast.success('Google Task status updated!');
        fetchGoogleTasks();
      } catch (error: any) {
        toast.error(`Failed to update Google Task status: ${error.message}`);
        console.error('Google Task status update error:', error);
      }
    } else {
      // Handle local task status toggle
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateLocalTask(task.id, { status: newStatus });
      fetchTasks();
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    if (task.isGoogleTask) {
      let descContent = task.description || '';
      let currentPriority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

      if (descContent.startsWith(GOOGLE_URGENT_INDICATOR)) {
        currentPriority = 'urgent';
        descContent = descContent.substring(GOOGLE_URGENT_INDICATOR.length).trim();
      }
      setDescription(descContent);
      setPriority(currentPriority);
    } else {
      setDescription(task.description || '');
      setPriority(task.priority);
    }
    setDueDate(task.due_date || '');
    setProjectId(task.project_id || '');
    setShowForm(true);
  };

  const handleDelete = async (task: Task) => {
    if (task.isGoogleTask) {
      if (!googleAccessToken || !task.googleTaskListId || !task.googleTaskId) {
        toast.error('Google Tasks API not available or task ID missing.');
        return;
      }
      try {
        await googleApiFetch(`lists/${task.googleTaskListId}/tasks/${task.googleTaskId}`, {
          method: 'DELETE',
        });
        toast.success('Google Task deleted!');
        fetchGoogleTasks();
      } catch (error: any) {
        toast.error(`Failed to delete Google Task: ${error.message}`);
        console.error('Google Task delete error:', error);
      }
    } else {
      // Handle local task deletion
      await deleteLocalTask(task.id);
      fetchTasks();
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="text-red-400" size={16} />;
      case 'high':
        return <AlertTriangle className="text-orange-400" size={16} />;
      case 'medium':
        return <Clock className="text-yellow-400" size={16} />;
      case 'low':
        return <Clock className="text-green-400" size={16} />;
      default:
        return <Clock className="text-gray-400" size={16} />;
    }
  };

  const allTasks = [...tasks, ...googleTasks];

  const filteredAndSortedTasks = allTasks
    .filter(task => {
      if (filterStatus === 'all') return true;
      return task.status === filterStatus;
    })
    .sort((a, b) => {
      // Prioritize pending tasks first
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      if (sortByDate) {
        const hasDateA = !!a.due_date;
        const hasDateB = !!b.due_date;

        if (hasDateA && !hasDateB) return -1;
        if (!hasDateA && hasDateB) return 1;

        if (hasDateA && hasDateB) {
          const dateA = new Date(a.due_date!).getTime();
          const dateB = new Date(b.due_date!).getTime();
          return dateA - dateB;
        }

        // If no due date, fall back to priority
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // Default sort by priority if not sorting by date
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Task Matrix</h1>
          <p className="text-gray-400">Organize your mission objectives</p>
        </div>
        <div className="flex gap-4">
          {!isSignedInGoogle ? (
            <Button
              onClick={handleGoogleSignIn}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Connect Google Tasks
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={selectedGoogleTaskListId || ''} onValueChange={setSelectedGoogleTaskListId}>
                <SelectTrigger className="w-48 bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select Google List" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {googleTaskLists.length === 0 ? (
                    <SelectItem value="no-lists" disabled>No Google Task Lists Found</SelectItem>
                  ) : (
                    googleTaskLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreateGoogleTask}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!selectedGoogleTaskListId}
              >
                <Plus size={20} className="mr-2" />
                New Google Task
              </Button>
              <Button
                onClick={handleGoogleSignOut}
                variant="outline"
                className="text-red-400 border-red-400 hover:bg-red-900/20"
              >
                Sign Out Google
              </Button>
            </div>
          )}
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingTask(null); // Ensure we're creating a new LOCAL task
              setTitle('');
              setDescription('');
              setPriority('medium');
              setDueDate('');
              setProjectId('');
            }}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
          >
            <Plus size={20} className="mr-2" />
            New Local Task
          </Button>
          <Button
            onClick={handleLocalSync}
            variant="outline"
            className="text-white border-cyan-400 hover:bg-cyan-900/20"
            title="Synchronize Google and Local Tasks"
          >
            <RefreshCw size={20} className="mr-2" />
            Sync Tasks
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-gray-800/50 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => setSortByDate(prev => !prev)} className="text-gray-400 border-gray-700 hover:bg-gray-800/20">
          {sortByDate ? 'Sort by Priority' : 'Sort by Due Date'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {editingTask ? (editingTask.isGoogleTask ? 'Edit Google Task' : 'Edit Local Task') : (editingTask?.isGoogleTask ? 'New Google Task' : 'New Local Task')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
              required
            />
            <Textarea
              placeholder="Task description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={priority} onValueChange={(value: Task['priority']) => setPriority(value)}>
                <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white"
              />
              {!(editingTask?.isGoogleTask || (showForm && editingTask === null && selectedGoogleTaskListId && isSignedInGoogle && editingTask?.isGoogleTask !== false)) && ( // Only show Project for local tasks. Re-evaluated condition for clarity.
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="no-project">No Project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                {editingTask ? 'Update' : 'Create'} Task
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {filteredAndSortedTasks.map((task) => (
          <div
            key={task.id}
            className={`bg-gray-800/40 border rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300 ${
              task.status === 'completed'
                ? 'border-green-500/30 bg-green-900/10'
                : 'border-gray-700/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <button
                onClick={() => toggleTaskStatus(task)}
                className="mt-1 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 size={20} className="text-green-400" />
                ) : (
                  <Circle size={20} />
                )}
              </button>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3
                    className={`text-lg font-semibold ${
                      task.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'
                    }`}
                  >
                    {task.title}
                  </h3>
                  <div className="flex gap-2 items-center">
                    {task.isGoogleTask && <span className="text-xs text-blue-400 px-2 py-0.5 rounded-full bg-blue-900/30">Google Task</span>}
                    <button
                      onClick={() => handleEdit(task)}
                      className="text-cyan-400 hover:text-cyan-300 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {task.description && <p className="text-gray-300 mb-3">{task.description}</p>}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {getPriorityIcon(task.priority)}
                      <span className="text-sm text-gray-400 capitalize">{task.priority}</span>
                    </div>
                    {task.due_date && (
                      <span className="text-sm text-gray-400">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      task.status === 'completed'
                        ? 'bg-green-900/30 text-green-400'
                        : task.status === 'in_progress'
                        ? 'bg-blue-900/30 text-blue-400'
                        : 'bg-gray-700/30 text-gray-400'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No tasks found</p>
          <p className="text-gray-500">Create your first task to get started</p>
        </div>
      )}
    </div>
  );
};