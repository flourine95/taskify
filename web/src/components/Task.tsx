import { Draggable } from '@hello-pangea/dnd';
import type { Task as TaskType } from '@/types';
import { cn } from '@/lib/utils';

interface TaskProps {
  task: TaskType;
  index: number;
}

export function Task({ task, index }: TaskProps) {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm"
        >
          <h3 className="font-medium mb-2">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {task.description}
            </p>
          )}
          <span className={cn(
            'text-xs px-2 py-1 rounded-full',
            priorityColors[task.priority]
          )}>
            {task.priority}
          </span>
        </div>
      )}
    </Draggable>
  );
} 