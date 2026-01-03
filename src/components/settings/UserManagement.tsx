"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Shield, Mail } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface AllowedUser {
  id: number;
  email: string;
  addedBy: string | null;
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users/allowed");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setIsAdmin(data.isAdmin);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/users/allowed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${newEmail} has been added to the approved list`);
        setNewEmail("");
        fetchUsers();
      } else {
        setError(data.error || "Failed to add user");
      }
    } catch (err) {
      setError("Failed to add user");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the approved list?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/users/allowed", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${email} has been removed from the approved list`);
        fetchUsers();
      } else {
        setError(data.error || "Failed to remove user");
      }
    } catch (err) {
      setError("Failed to remove user");
    }
  };

  if (isLoading) {
    return (
      <Card padding="none" className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="divide-y divide-[var(--border)]">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)]">
              Approved Family Members
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {users.length} user{users.length !== 1 ? "s" : ""} can access this app
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-500">
            {success}
          </div>
        )}

        <form onSubmit={handleAddUser} className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter family member's email"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newEmail.trim()}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            Add
          </button>
        </form>

        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-amber-600">joetutera@gmail.com</span>
              <span className="text-[var(--text-secondary)]"> — Admin (always has access)</span>
            </div>
          </div>
          
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-[var(--accent)]">
                    {user.email[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {user.email}
                  </p>
                  {user.addedBy && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Added by {user.addedBy}
                    </p>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteUser(user.email)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remove user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
              No additional users added yet. Add family members above to give them access.
            </p>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-[var(--surface)]">
          <p className="text-xs text-[var(--text-secondary)]">
            Only the admin can remove users from the approved list.
          </p>
        </div>
      )}
    </Card>
  );
}
