export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}


export type Column = {
  id: string;
  title: string;
  tasks: Task[];
};

export type Board = {
  columns: Column[];
}; 