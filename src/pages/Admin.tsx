import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, DocumentData } from 'firebase/firestore';
import './Admin.css';
interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  [key: string]: any; // For additional fields that might exist
}

const Admin: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const db = getFirestore();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                const usersData: User[] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsers(usersData);
            } catch (err) {
                setError('Failed to fetch users');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [db]);

    if (isLoading) return <div className="loading">Loading users...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="admin-container">
            <h1 className="admin-header">Admin Dashboard</h1>
            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Phone Number</th>
                            <th>UID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? (
                            users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.email || 'N/A'}</td>
                                    <td>{user.phoneNumber || 'N/A'}</td>
                                    <td className="uid-cell">{user.id}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="no-users">No users found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Admin;