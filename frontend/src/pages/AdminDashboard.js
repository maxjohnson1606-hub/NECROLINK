import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Megaphone, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [members, setMembers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', type: 'general' });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [appsRes, membersRes, announcementsRes] = await Promise.all([
        axios.get(`${API}/applications`, { withCredentials: true }),
        axios.get(`${API}/members`, { withCredentials: true }),
        axios.get(`${API}/announcements`, { withCredentials: true }),
      ]);
      setApplications(appsRes.data);
      setMembers(membersRes.data);
      setAnnouncements(announcementsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (email, status) => {
    try {
      await axios.patch(`${API}/applications/${email}/status?status=${status}`, {}, { withCredentials: true });
      fetchData();
    } catch (error) {
      console.error('Error updating application:', error);
    }
  };

  const createAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/announcements`, newAnnouncement, { withCredentials: true });
      setNewAnnouncement({ title: '', content: '', type: 'general' });
      fetchData();
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const deleteAnnouncement = async (title) => {
    try {
      await axios.delete(`${API}/announcements/${title}`, { withCredentials: true });
      fetchData();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-darknet-bg flex items-center justify-center">
        <div className="text-neon-blue font-body text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darknet-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-neon-blue uppercase tracking-tight mb-2" data-testid="admin-dashboard-title">
            Admin Dashboard
          </h1>
          <p className="font-body text-sm text-text-secondary">Welcome back, {user?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-darknet-surface border border-neon-blue/50 p-6" data-testid="stat-applications">
            <FileText className="w-8 h-8 text-neon-blue mb-2" />
            <p className="font-body text-2xl font-bold text-white">{applications.filter(a => a.status === 'pending').length}</p>
            <p className="font-body text-xs text-text-muted uppercase tracking-wider">Pending Applications</p>
          </div>
          <div className="bg-darknet-surface border border-neon-purple/50 p-6" data-testid="stat-members">
            <Users className="w-8 h-8 text-neon-purple mb-2" />
            <p className="font-body text-2xl font-bold text-white">{members.length}</p>
            <p className="font-body text-xs text-text-muted uppercase tracking-wider">Total Members</p>
          </div>
          <div className="bg-darknet-surface border border-neon-red/50 p-6" data-testid="stat-announcements">
            <Megaphone className="w-8 h-8 text-neon-red mb-2" />
            <p className="font-body text-2xl font-bold text-white">{announcements.length}</p>
            <p className="font-body text-xs text-text-muted uppercase tracking-wider">Active Announcements</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border-DEFAULT">
          <button
            onClick={() => setActiveTab('applications')}
            data-testid="tab-applications"
            className={`font-body text-sm uppercase tracking-wider pb-3 transition-colors ${
              activeTab === 'applications'
                ? 'text-neon-blue border-b-2 border-neon-blue'
                : 'text-text-muted hover:text-neon-blue'
            }`}
          >
            Applications
          </button>
          <button
            onClick={() => setActiveTab('members')}
            data-testid="tab-members"
            className={`font-body text-sm uppercase tracking-wider pb-3 transition-colors ${
              activeTab === 'members'
                ? 'text-neon-blue border-b-2 border-neon-blue'
                : 'text-text-muted hover:text-neon-blue'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            data-testid="tab-announcements"
            className={`font-body text-sm uppercase tracking-wider pb-3 transition-colors ${
              activeTab === 'announcements'
                ? 'text-neon-blue border-b-2 border-neon-blue'
                : 'text-text-muted hover:text-neon-blue'
            }`}
          >
            Announcements
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div className="space-y-4" data-testid="applications-tab">
              {applications.length === 0 ? (
                <p className="font-body text-text-muted" data-testid="no-applications">No applications yet.</p>
              ) : (
                applications.map((app, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-darknet-surface border border-border-DEFAULT p-6"
                    data-testid={`application-${index}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-heading text-lg font-bold text-white uppercase">{app.name}</h3>
                          <span className={`px-2 py-1 text-xs font-body uppercase tracking-wider border ${
                            app.status === 'pending' ? 'border-yellow-400 text-yellow-400' :
                            app.status === 'approved' ? 'border-neon-blue text-neon-blue' :
                            'border-neon-red text-neon-red'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-body text-sm text-text-secondary mb-3">
                          <p><span className="text-neon-purple">Email:</span> {app.email}</p>
                          <p><span className="text-neon-purple">IGN:</span> {app.game_name}</p>
                          <p><span className="text-neon-purple">Role:</span> {app.preferred_role}</p>
                          <p><span className="text-neon-purple">Experience:</span> {app.experience}</p>
                          {app.discord_username && (
                            <p><span className="text-neon-purple">Discord:</span> {app.discord_username}</p>
                          )}
                        </div>
                        <p className="font-body text-sm text-text-secondary"><span className="text-neon-blue">Reason:</span> {app.reason}</p>
                      </div>
                      
                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateApplicationStatus(app.email, 'approved')}
                            data-testid={`approve-btn-${index}`}
                            className="px-4 py-2 bg-neon-blue/10 border border-neon-blue text-neon-blue font-body text-xs uppercase tracking-wider hover:bg-neon-blue/20 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => updateApplicationStatus(app.email, 'rejected')}
                            data-testid={`reject-btn-${index}`}
                            className="px-4 py-2 bg-neon-red/10 border border-neon-red text-neon-red font-body text-xs uppercase tracking-wider hover:bg-neon-red/20 transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-4" data-testid="members-tab">
              <p className="font-body text-sm text-text-secondary mb-4">
                Total Members: {members.length}
              </p>
              {members.map((member, index) => (
                <div key={index} className="bg-darknet-surface border border-border-DEFAULT p-4" data-testid={`member-row-${index}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-base font-bold text-white uppercase">{member.name}</h3>
                      <p className="font-body text-sm text-neon-blue">{member.game_name} - {member.role}</p>
                      <p className="font-body text-xs text-text-muted">{member.rank}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-body text-sm text-text-secondary">Wins: {member.wins || 0}</p>
                      <p className="font-body text-sm text-text-secondary">MVP: {member.mvp_count || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div data-testid="announcements-tab">
              {/* Create Announcement Form */}
              <div className="bg-darknet-surface border border-neon-purple/50 p-6 mb-6">
                <h3 className="font-heading text-lg font-bold text-neon-purple uppercase mb-4">Create Announcement</h3>
                <form onSubmit={createAnnouncement} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      data-testid="announcement-title"
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                      required
                      className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-2 font-body text-white text-sm focus:border-neon-blue focus:outline-none"
                      placeholder="Announcement Title"
                    />
                  </div>
                  <div>
                    <textarea
                      data-testid="announcement-content"
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                      required
                      rows={3}
                      className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-2 font-body text-white text-sm focus:border-neon-blue focus:outline-none resize-none"
                      placeholder="Announcement Content"
                    />
                  </div>
                  <div className="flex gap-4">
                    <select
                      data-testid="announcement-type"
                      value={newAnnouncement.type}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                      className="bg-darknet-terminal border border-border-DEFAULT px-4 py-2 font-body text-white text-sm focus:border-neon-blue focus:outline-none"
                    >
                      <option value="general">General</option>
                      <option value="event">Event</option>
                      <option value="recruitment">Recruitment</option>
                      <option value="tournament">Tournament</option>
                    </select>
                    <button
                      type="submit"
                      data-testid="create-announcement-btn"
                      className="px-6 py-2 bg-neon-purple border border-neon-purple text-white font-body text-sm uppercase tracking-wider hover:shadow-[0_0_15px_rgba(176,38,255,0.5)] transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Post
                    </button>
                  </div>
                </form>
              </div>

              {/* Announcements List */}
              <div className="space-y-4">
                {announcements.map((announcement, index) => (
                  <div key={index} className="bg-darknet-surface border border-border-DEFAULT p-4" data-testid={`announcement-item-${index}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs font-body uppercase tracking-wider border border-neon-purple text-neon-purple">
                            {announcement.type}
                          </span>
                          <h3 className="font-heading text-base font-bold text-white uppercase">{announcement.title}</h3>
                        </div>
                        <p className="font-body text-sm text-text-secondary">{announcement.content}</p>
                      </div>
                      <button
                        onClick={() => deleteAnnouncement(announcement.title)}
                        data-testid={`delete-announcement-${index}`}
                        className="ml-4 p-2 text-neon-red hover:bg-neon-red/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};