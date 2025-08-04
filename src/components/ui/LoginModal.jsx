import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import AuthUI from '../auth/AuthUI';

export default function LoginModal({ isOpen, onOpenChange }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign In / Sign Up</DialogTitle>
          <DialogDescription>
            Access your saved sessions and personalize your experience.
          </DialogDescription>
        </DialogHeader>
        <AuthUI onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
