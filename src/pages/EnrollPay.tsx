import { User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; 
const EnrollPay = ({ user }: { user: User | null }) => {
    const [packageName, setPackageName] = useState<string | null>(null);
    useEffect(() => {
        const fetchPackage = async () => {
          if (!user) return;
    
          try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              console.log("User doc data:", data);
              setPackageName(data.packageName || "No package selected");
            } else {
              console.warn("User document not found.");
              setPackageName("User document not found");
            }
          } catch (error) {
            console.error("Error fetching package:", error);
            setPackageName("Error fetching package");
          }
        };
    
        fetchPackage();
      }, [user]);

  return (
    <div>
        <h1>Enroll Pay</h1>
        <p>Selected Package: <strong>{packageName}</strong></p>
    </div>
  );
};

export default EnrollPay;