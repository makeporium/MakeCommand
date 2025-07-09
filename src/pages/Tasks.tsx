
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
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
}

interface Project {
  id: string;
  name: string;
  color: string;
}

export const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchProjects();
    }
  }, [user]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch tasks');
    } else {
      setTasks(data || []);
    }
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, color')
      .order('name');

    if (error) {
      console.error('Failed to fetch projects:', error);
    } else {
      setProjects(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const taskData = {
      title,
      description: description || null,
      priority,
      due_date: dueDate || null,
      project_id: projectId || null,
      user_id: user.id,
    };

    let error;
    if (editingTask) {
      ({ error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id));
    } else {
      ({ error } = await supabase
        .from('tasks')
        .insert([taskData]));
    }

    if (error) {
      toast.error('Failed to save task');
    } else {
      toast.success(editingTask ? 'Task updated!' : 'Task created!');
      resetForm();
      fetchTasks();
    }
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
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        completed_at: completedAt
      })
      .eq('id', task.id);

    if (error) {
      toast.error('Failed to update task');
    } else {
      fetchTasks();
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDueDate(task.due_date || '');
    setProjectId(task.project_id || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete task');
    } else {
      toast.success('Task deleted');
      fetchTasks();
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="text-red-400" size={16} />;
      case 'high': return <AlertTriangle className="text-orange-400" size={16} />;
      case 'medium': return <Clock className="text-yellow-400" size={16} />;
      case 'low': return <Clock className="text-green-400" size={16} />;
      default: return <Clock className="text-gray-400" size={16} />;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Task Matrix</h1>
          <p className="text-gray-400">Organize your mission objectives</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
        >
          <Plus size={20} className="mr-2" />
          New Task
        </Button>
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
      </div>

      {showForm && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {editingTask ? 'Edit Task' : 'New Task'}
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
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
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
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="">No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`bg-gray-800/40 border rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300 ${
              task.status === 'completed' ? 'border-green-500/30 bg-green-900/10' : 'border-gray-700/50'
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
                  <h3 className={`text-lg font-semibold ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>
                    {task.title}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(task)}
                      className="text-cyan-400 hover:text-cyan-300 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {task.description && (
                  <p className="text-gray-300 mb-3">{task.description}</p>
                )}
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
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    task.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                    task.status === 'in_progress' ? 'bg-blue-900/30 text-blue-400' :
                    'bg-gray-700/30 text-gray-400'
                  }`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No tasks found</p>
          <p className="text-gray-500">Create your first task to get started</p>
        </div>
      )}
    </div>
  );
};
