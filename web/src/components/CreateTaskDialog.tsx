import * as React from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { Button } from './ui/button';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Thêm công việc</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Tạo công việc mới</DialogTitle>
        <DialogDescription>
          {/* Form để tạo công việc mới */}
          <form>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
              <input type="text" className="mt-1 block w-full" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Mô tả</label>
              <textarea className="mt-1 block w-full"></textarea>
            </div>
            <Button type="submit">Tạo</Button>
          </form>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
} 