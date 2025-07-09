
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar as CalendarIcon, Clock, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'birthday' | 'meeting' | 'reminder' | 'personal' | 'work';
  event_date: string;
  event_time?: string;
  all_day: boolean;
  created_at: string;
}

export const Calendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'birthday' | 'meeting' | 'reminder' | 'personal' | 'work'>('personal');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      toast.error('Failed to fetch events');
    } else {
      setEvents(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const eventData = {
      title,
      description: description || null,
      event_type: eventType,
      event_date: eventDate,
      event_time: allDay ? null : eventTime,
      all_day: allDay,
      user_id: user.id,
    };

    let error;
    if (editingEvent) {
      ({ error } = await supabase
        .from('calendar_events')
        .update(eventData)
        .eq('id', editingEvent.id));
    } else {
      ({ error } = await supabase
        .from('calendar_events')
        .insert([eventData]));
    }

    if (error) {
      toast.error('Failed to save event');
    } else {
      toast.success(editingEvent ? 'Event updated!' : 'Event created!');
      resetForm();
      fetchEvents();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventType('personal');
    setEventDate('');
    setEventTime('');
    setAllDay(false);
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setEventType(event.event_type);
    setEventDate(event.event_date);
    setEventTime(event.event_time || '');
    setAllDay(event.all_day);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete event');
    } else {
      toast.success('Event deleted');
      fetchEvents();
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'birthday': return 'bg-pink-900/30 text-pink-400 border-pink-500/30';
      case 'meeting': return 'bg-blue-900/30 text-blue-400 border-blue-500/30';
      case 'reminder': return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30';
      case 'personal': return 'bg-green-900/30 text-green-400 border-green-500/30';
      case 'work': return 'bg-purple-900/30 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-700/30 text-gray-400 border-gray-500/30';
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(event => event.event_date >= today).slice(0, 5);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Temporal Nexus</h1>
          <p className="text-gray-400">Schedule and track your timeline</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
        >
          <Plus size={20} className="mr-2" />
          New Event
        </Button>
      </div>

      {showForm && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {editingEvent ? 'Edit Event' : 'New Event'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Event title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
              required
            />
            <Textarea
              placeholder="Event description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={eventType} onValueChange={(value: any) => setEventType(value)}>
                <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white"
                required
              />
              {!allDay && (
                <Input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="allDay" className="text-white">All Day Event</label>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                {editingEvent ? 'Update' : 'Create'} Event
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-cyan-400">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-400 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 font-medium">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                <div key={`empty-${i}`} className="p-2"></div>
              ))}
              {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                const day = i + 1;
                const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = events.filter(event => event.event_date === dateString);
                const isToday = dateString === today;
                
                return (
                  <div
                    key={day}
                    className={`p-2 min-h-12 border border-gray-700/30 rounded ${
                      isToday ? 'bg-cyan-900/30 border-cyan-500/50' : 'hover:bg-gray-700/30'
                    }`}
                  >
                    <div className="text-white text-sm font-medium">{day}</div>
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <div
                        key={idx}
                        className={`text-xs px-1 py-0.5 rounded mt-1 ${getEventTypeColor(event.event_type)} truncate`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-400 mt-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Upcoming Events</h2>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className={`border rounded-lg p-3 ${getEventTypeColor(event.event_type)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{event.title}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-cyan-400 hover:text-cyan-300 p-1"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon size={14} />
                  <span>{formatDate(event.event_date)}</span>
                  {!event.all_day && event.event_time && (
                    <>
                      <Clock size={14} />
                      <span>{event.event_time}</span>
                    </>
                  )}
                </div>
                {event.description && (
                  <p className="text-sm mt-2 opacity-80">{event.description}</p>
                )}
              </div>
            ))}
            {upcomingEvents.length === 0 && (
              <p className="text-gray-400 text-center py-4">No upcoming events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
