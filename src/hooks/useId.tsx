import Homework from "../pages/Homework/Homework";

const generateHomeworkId = (hw: Homework): string => {
    // Create a deterministic ID using name and dates
    const assignedDateStr = hw.assignedDate ? hw.assignedDate.toDate().getTime() : 'nodate';
    const dueDateStr = hw.dueDate ? hw.dueDate.toDate().getTime() : 'nodate';
    return `${hw.name}-${assignedDateStr}-${dueDateStr}`;
};

export default generateHomeworkId;