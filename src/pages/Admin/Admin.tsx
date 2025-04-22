import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, arrayRemove, Timestamp } from 'firebase/firestore';
import './Admin.css';
import { useNavigate } from 'react-router-dom';
import Homework from '../Homework/Homework';

interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  admin?: boolean;
  paid?: boolean;
}

interface Course {
  id: string;
  courseName: string;
  students: string[];
  studentEmails: string[];
  homework: Homework[];
}

const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const db = getFirestore();

  const navigate = useNavigate();

  const handleTogglePost = async (courseId: string, hwId: string) => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) return;
  
      const courseData = courseSnap.data();
      const homework = [...(courseData.homework || [])];
      const hwIndex = homework.findIndex(hw => hw.id === hwId);
      
      if (hwIndex === -1) return;
      
      homework[hwIndex].posted = !homework[hwIndex].posted;
  
      await updateDoc(courseRef, { homework });
  
      setCourses(prevCourses => 
        prevCourses.map(course => {
          if (course.id === courseId) {
            return {
              ...course,
              homework: course.homework?.map(hw => 
                hw.id === hwId ? {...hw, posted: !hw.posted} : hw
              )
            };
          }
          return course;
        })
      );
    } catch (err) {
      console.error('Error updating post status:', err);
      alert('Failed to update post status');
    }
  };

  const handleTogglePaid = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
  
      const currentPaid = userSnap.data()?.paid ?? false;
      await updateDoc(userRef, { paid: !currentPaid });
  
      // Immediately update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, paid: !currentPaid } : user
        )
      );
    } catch (err) {
      console.error('Error toggling paid status:', err);
      alert('Failed to update paid status');
    }
  };
  

  const handleToggleLock = async (courseId: string, hwId: string) => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) return;
  
      const courseData = courseSnap.data();
      const homework = [...(courseData.homework || [])];
      const hwIndex = homework.findIndex(hw => hw.id === hwId);
      
      if (hwIndex === -1) return;
      
      // Toggle the locked status
      homework[hwIndex].locked = !homework[hwIndex].locked;
  
      await updateDoc(courseRef, { homework });
  
      // Update local state to match Firestore changes
      setCourses(prevCourses => 
        prevCourses.map(course => {
          if (course.id === courseId) {
            return {
              ...course,
              homework: course.homework?.map(hw => 
                hw.id === hwId ? {...hw, locked: !hw.locked} : hw
              )
            };
          }
          return course;
        })
      );
    } catch (err) {
      console.error('Error updating lock status:', err);
      alert('Failed to update lock status');
    }
  };
  
  const handleDeleteAssignment = async (courseId: string, hwId: string) => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) return;
  
      const courseData = courseSnap.data();
      const updatedHomework = courseData.homework.filter(
        (hw: Homework) => hw.id !== hwId
      );
  
      await updateDoc(courseRef, { homework: updatedHomework });
      
      setCourses(prevCourses => 
        prevCourses.map(course => {
          if (course.id === courseId) {
            return {
              ...course,
              homework: course.homework?.filter(hw => hw.id !== hwId)
            };
          }
          return course;
        })
      );
    } catch (err) {
      console.error('Error deleting assignment:', err);
      alert('Failed to delete assignment');
    }
  };

  const handleRemoveStudent = async (courseId: string, userIdToRemove: string) => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        students: arrayRemove(userIdToRemove)
      });

      setCourses(prevCourses => 
        prevCourses.map(course => {
          if (course.id === courseId) {
            const studentIndex = course.students.indexOf(userIdToRemove);
            if (studentIndex === -1) return course;
            
            return {
              ...course,
              students: course.students.filter(id => id !== userIdToRemove),
              studentEmails: course.studentEmails.filter((_, idx) => idx !== studentIndex)
            };
          }
          return course;
        })
      );
    } catch (error) {
      console.error('Error removing student:', error);
      alert('Failed to remove student');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      return date.toDate().toLocaleDateString();
    } catch (err) {
      return typeof date === "string" ? date : "Invalid date";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnapshot, coursesSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'courses'))
        ]);

        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const coursesData = await Promise.all(
          coursesSnapshot.docs.map(async (courseDoc) => {
            const courseData = courseDoc.data();
            const studentEmails = await Promise.all(
              (courseData.students || []).map(async (userId: string) => {
                const userDoc = await getDoc(doc(db, 'users', userId));
                return userDoc.exists() ? userDoc.data()?.email || 'N/A' : 'Deleted User';
              })
            );
            
            return {
              id: courseDoc.id,
              courseName: courseData.courseName || 'Unnamed Course',
              students: courseData.students || [],
              studentEmails,
              homework: courseData.homework || []
            };
          })
        );

        setUsers(usersData);
        setCourses(coursesData);
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [db]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourse(prev => prev === courseId ? null : courseId);
  };

  if (isLoading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-container">
      <h1 className="admin-header">Admin Dashboard</h1>

      {/* Users Table */}
      <div className="table-section ">
        <h2>Users</h2>
        <div className="table-container users-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Phone</th>
                <th>UID</th>
                <th>Mark Paid</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(user => !user.admin) // ⬅️ filters out admin users
                .map(user => (
                  <tr key={user.id}>
                    <td>{user.email || 'N/A'}</td>
                    <td>{user.phoneNumber || 'N/A'}</td>
                    <td className="uid">{user.id}</td>
                    <td>
                      <button className="mark-paid-btn" onClick={() => handleTogglePaid(user.id)}>
                        {user.paid ? 'Unmark Paid' : 'Mark Paid'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>

          </table>
        </div>
      </div>

      {/* Courses Table */}
      <div className="table-section">
        <h2>Courses</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Students</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <React.Fragment key={course.id}>
                  <tr>
                    <td>{course.courseName}</td>
                    <td>{course.students.length}</td>
                    <td>
                      <button 
                        className="toggle-btn"
                        onClick={() => toggleCourse(course.id)}
                      >
                        {expandedCourse === course.id ? '▼' : '▶'}
                      </button>
                    </td>
                  </tr>
                  {expandedCourse === course.id && (
                    <tr className="expanded">
                      <td colSpan={3}>
                        <div className="student-list">
                          <h3>Enrolled Students:</h3>
                          {course.students.map((userId, index) => (
                            <div key={userId} className="student-item">
                              <span className="student-email">
                                {course.studentEmails[index] || 'Unknown User'}
                              </span>
                              <button 
                                className="remove-student-btn"
                                onClick={() => handleRemoveStudent(course.id, userId)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Homework Assignments Table */}
                        <div className="homework-section">
                          <h3>Lesson Assignments:</h3>
                          <button 
                            onClick={() => navigate(`/admin/create-draft/${course.id}`)}
                            className="create-draft-btn"
                          >
                            Create Draft
                          </button>
                          <div className="table-container lessons-table">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Assignment Name</th>
                                  <th>Assigned Date</th>
                                  <th>Due Date</th>
                                  <th>Lock Status</th>
                                  <th>Post Status</th>
                                  <th>Delete</th>
                                </tr>
                              </thead>
                              <tbody>
                              {course.homework?.map((hw) => (
                              <tr 
                                onClick={() => {
                                  // Store the homework data in sessionStorage before navigation
                                  const homeworkData = {
                                    ...hw,
                                    id: hw.id,
                                    assignedDate: hw.assignedDate,
                                    dueDate: hw.dueDate,
                                    name: hw.name,
                                    posted: hw.posted
                                  };
                                  sessionStorage.setItem('allHomework', JSON.stringify([homeworkData]));
                                  navigate(`/homework/assignment/${hw.id}`);
                                }} 
                                key={hw.id}
                              >
                                <td>{hw.name}</td>
                                <td>{formatDate(hw.assignedDate)}</td>
                                <td>{formatDate(hw.dueDate)}</td>
                                {/* New Lock/Unlock Column */}
                                <td onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className={`lock-btn ${hw.locked ? 'locked' : 'unlocked'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleLock(course.id, hw.id);
                                    }}
                                  >
                                    {hw.locked ? "Unlock" : "Lock"}
                                  </button>
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className={`post-btn ${hw.posted ? 'posted' : 'draft'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTogglePost(course.id, hw.id);
                                    }}
                                  >
                                    {hw.posted ? "Unpost" : "Post"}
                                  </button>
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className="delete-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAssignment(course.id, hw.id);
                                    }}
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;