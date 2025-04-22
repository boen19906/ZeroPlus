import { User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./EnrollPay.css"; // Regular CSS import

interface UserData {
  packageName?: string;
  phoneNumber?: string;
  zalo?: string;
  profileImage?: string;
}

const EnrollPay: React.FC<{ user: User | null }> = ({ user }) => {
  const [userData, setUserData] = useState<UserData>({});
  const [loading, setLoading] = useState(true);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            packageName: data.packageName || "No package selected",
            phoneNumber: data.phoneNumber || "",
            zalo: data.zalo || "",
            profileImage: data.profileImage || ""
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      // TODO: Add image upload to Firebase Storage
    }
  };

  const handleSave = async () => {
    setIsSubmitted(true);
    if (!user) return;
  
    try {
      let downloadURL = null;
  
      // ⬇️ If a new image is selected, upload it
      if (profileImageFile) {
        const storageRef = ref(storage, `profileImages/${user.uid}`);
        await uploadBytes(storageRef, profileImageFile);
        downloadURL = await getDownloadURL(storageRef);
      }
  
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        phoneNumber: userData.phoneNumber,
        zalo: userData.zalo,
        ...(downloadURL && { profileImage: downloadURL }) // only set if image uploaded
      });
  
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="enroll-pay-container">
      <h1 className="enroll-pay-header">Enroll Pay</h1>
      {!isSubmitted ? (
      <div className="enroll-pay-form">
        <div className="package-info">
          <p>Selected Package: <strong>{userData.packageName}</strong></p>
        </div>

        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            name="phoneNumber"
            value={userData.phoneNumber}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label>Zalo ID</label>
          <input
            type="text"
            name="zalo"
            value={userData.zalo}
            onChange={handleInputChange}
          />
        </div>

        <div className="profile-upload-section">
          <label className="profile-upload-label">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="profile-file-input"
            />
            <div className="profile-upload-box">
              {userData.profileImage || profileImageFile ? (
                <img 
                  src={profileImageFile ? URL.createObjectURL(profileImageFile) : userData.profileImage} 
                  alt="Profile preview" 
                  className="profile-image-preview"
                />
              ) : (
                <>
                  <div className="upload-icon">📷</div>
                  <p>Click to upload profile picture</p>
                </>
              )}
            </div>
          </label>
        </div>

        <div className="qr-code-container">
          <img src="/qrcode.png" alt="QR Code" className="qr-code" />
          <label className="qr-code-label">Zalo QR Code</label>
        </div>



        <button onClick={handleSave} className="save-button">
          Enroll
        </button>
      </div>
      ) : (
        <div className="enroll-pay-form">
          <h2>Thanks for your payment!</h2>
        </div>
      )}
    </div>
  );
};

export default EnrollPay;