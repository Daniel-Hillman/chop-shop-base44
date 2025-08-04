import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; 
import { auth } from '../firebase';

const chopSessionsCollection = collection(db, 'chopSessions');

export const ChopSession = {
  async create(sessionData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      // Sanitize chops to remove non-serializable audioData
      const sanitizedChops = sessionData.chops.map(({ audioData, ...chop }) => chop);

      const docRef = await addDoc(chopSessionsCollection, {
        ...sessionData,
        chops: sanitizedChops, // Save the sanitized version
        userId: user.uid,
        created_date: new Date(),
      });
      return docRef.id;
    } catch (e) {
      console.error('Error adding document: ', e);
      throw e;
    }
  },

  async list(sortOrder = '-created_date') {
    try {
      const user = auth.currentUser;
      if (!user) return [];

      const q = query(
        chopSessionsCollection,
        where('userId', '==', user.uid),
        orderBy('created_date', sortOrder.startsWith('-') ? 'desc' : 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error('Error getting documents: ', e);
      throw e;
    }
  },

  async get(id) {
    try {
      const docRef = doc(db, 'chopSessions', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const sessionData = docSnap.data();
        const user = auth.currentUser;
        if (sessionData.userId !== user?.uid) {
          throw new Error("User not authorized to view this session");
        }
        return { id: docSnap.id, ...sessionData };
      } else {
        console.log('No such document!');
        return null;
      }
    } catch (e) {
      console.error('Error getting document:', e);
      throw e;
    }
  },

  async delete(id) {
    try {
      const sessionToDelete = await this.get(id);
      if (!sessionToDelete) {
        throw new Error("Session not found or user not authorized.");
      }
      await deleteDoc(doc(db, 'chopSessions', id));
    } catch (e) {
      console.error('Error deleting document: ', e);
      throw e;
    }
  },
};
