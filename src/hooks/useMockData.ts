
import { ClassTime, Institution, Subject, Class, User, Attendance } from "@/types";
import { useLocalStorage } from "./useLocalStorage";

export const useMockData = () => {
  const [institutions, setInstitutions] = useLocalStorage<Institution[]>("institutions", [
    {
      id: "1",
      name: "Cursinho MAIO 68",
      active: true,
      settings: {
        classTimes: [
          {
            id: "1",
            name: "Primeira Aula",
            startTime: "20:30",
            endTime: "21:30",
            daysOfWeek: [4] // Thursday
          },
          {
            id: "2",
            name: "Segunda Aula",
            startTime: "21:30",
            endTime: "22:30",
            daysOfWeek: [4] // Thursday
          }
        ],
        attendanceValidationMethod: "qrcode",
        attendanceWindowMinutes: 15
      }
    }
  ]);

  const [users, setUsers] = useLocalStorage<User[]>("users", [
    {
      id: "1",
      name: "Admin",
      email: "admin@example.com",
      role: "admin",
      active: true
    },
    {
      id: "2",
      name: "João Silva",
      email: "coord@example.com",
      role: "coordinator",
      active: true,
      institutionId: "1"
    },
    {
      id: "3",
      name: "Maria Santos",
      email: "prof@example.com",
      role: "teacher",
      active: true,
      institutionId: "1"
    },
    {
      id: "4",
      name: "Carlos Oliveira",
      email: "prof2@example.com",
      role: "teacher",
      active: true,
      institutionId: "1"
    },
    {
      id: "5",
      name: "Pedro Alves",
      email: "aluno@example.com",
      role: "student",
      active: true,
      institutionId: "1"
    },
    {
      id: "6",
      name: "Ana Costa",
      email: "aluno2@example.com",
      role: "student",
      active: true,
      institutionId: "1"
    },
    {
      id: "7",
      name: "Luiza Fernandes",
      email: "aluno3@example.com",
      role: "student",
      active: true,
      institutionId: "1"
    }
  ]);

  const [subjects, setSubjects] = useLocalStorage<Subject[]>("subjects", [
    {
      id: "1",
      name: "Matemática",
      description: "Cálculo, Álgebra e Geometria",
      institutionId: "1",
      active: true
    },
    {
      id: "2",
      name: "Física",
      description: "Mecânica, Eletromagnetismo",
      institutionId: "1",
      active: true
    },
    {
      id: "3",
      name: "Química",
      description: "Orgânica e Inorgânica",
      institutionId: "1",
      active: true
    },
    {
      id: "4",
      name: "Biologia",
      description: "Biologia Celular, Genética",
      institutionId: "1",
      active: true
    },
    {
      id: "5",
      name: "Literatura",
      description: "Análise literária",
      institutionId: "1",
      active: true
    }
  ]);

  // Generate classes for current week
  const [classes, setClasses] = useLocalStorage<Class[]>("classes", generateClasses());

  // Generate attendance records
  const [attendance, setAttendance] = useLocalStorage<Attendance[]>("attendance", generateAttendance());

  function generateClasses(): Class[] {
    const result: Class[] = [];
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntilThursday = currentDay <= 4 ? 4 - currentDay : 7 + 4 - currentDay;
    
    const nextThursday = new Date(today);
    nextThursday.setDate(today.getDate() + daysUntilThursday);
    
    // Add classes for today (for demo purposes)
    if (currentDay !== 4) { // If not Thursday, add some for today too
      const todayDate = today.toISOString().split('T')[0];
      
      result.push({
        id: "today-1",
        date: todayDate,
        subjectId: "1", // Math
        teacherId: "3", // Maria
        classTimeId: "1", // First time slot
        institutionId: "1",
        title: "Revisão para o vestibular",
      });
      
      result.push({
        id: "today-2",
        date: todayDate,
        subjectId: "2", // Physics
        teacherId: "4", // Carlos
        classTimeId: "2", // Second time slot
        institutionId: "1",
        title: "Preparação ENEM",
      });
    }
    
    // Add classes for next Thursday
    const thursdayDate = nextThursday.toISOString().split('T')[0];
    
    result.push({
      id: "thurs-1",
      date: thursdayDate,
      subjectId: "1", // Math
      teacherId: "3", // Maria
      classTimeId: "1", // First time slot
      institutionId: "1",
      title: "Funções exponenciais",
    });
    
    result.push({
      id: "thurs-2",
      date: thursdayDate,
      subjectId: "2", // Physics
      teacherId: "4", // Carlos
      classTimeId: "2", // Second time slot
      institutionId: "1",
      title: "Movimento circular",
    });
    
    return result;
  }

  function generateAttendance(): Attendance[] {
    const result: Attendance[] = [];
    
    // For each class
    classes.forEach(cls => {
      // For each student
      const students = users.filter(u => u.role === "student");
      students.forEach(student => {
        // Create an attendance record with 80% chance of being present
        const status: Attendance["status"] = Math.random() > 0.2 ? "present" : "absent";
        
        result.push({
          id: `${cls.id}-${student.id}`,
          classId: cls.id,
          studentId: student.id,
          status,
          confirmedAt: status === "present" ? new Date().toISOString() : undefined,
          confirmedBy: status === "present" ? student.id : undefined,
        });
      });
    });
    
    return result;
  }

  const getInstitutions = () => {
    return institutions;
  };

  const getInstitution = (id: string) => {
    return institutions.find(i => i.id === id);
  };

  const createInstitution = (institution: Omit<Institution, "id">) => {
    const newInstitution = {
      ...institution,
      id: `inst-${Date.now()}`,
    };
    setInstitutions([...institutions, newInstitution]);
    return newInstitution;
  };

  const updateInstitution = (id: string, updates: Partial<Institution>) => {
    const newInstitutions = institutions.map(i => 
      i.id === id ? { ...i, ...updates } : i
    );
    setInstitutions(newInstitutions);
    return newInstitutions.find(i => i.id === id);
  };

  const getUsers = () => {
    return users;
  };

  const getUser = (id: string) => {
    return users.find(u => u.id === id);
  };

  const getStudentList = () => {
    return users.filter(u => u.role === "student" && u.active);
  };

  const createUser = (user: Omit<User, "id">) => {
    const newUser = {
      ...user,
      id: `user-${Date.now()}`,
    };
    setUsers([...users, newUser]);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const newUsers = users.map(u => 
      u.id === id ? { ...u, ...updates } : u
    );
    setUsers(newUsers);
    return newUsers.find(u => u.id === id);
  };

  const getSubjects = () => {
    return subjects;
  };

  const getSubject = (id: string) => {
    return subjects.find(s => s.id === id);
  };

  const createSubject = (subject: Omit<Subject, "id">) => {
    const newSubject = {
      ...subject,
      id: `subj-${Date.now()}`,
    };
    setSubjects([...subjects, newSubject]);
    return newSubject;
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    const newSubjects = subjects.map(s => 
      s.id === id ? { ...s, ...updates } : s
    );
    setSubjects(newSubjects);
    return newSubjects.find(s => s.id === id);
  };

  const getClasses = () => {
    // Enrich classes with subject and teacher data
    return classes.map(c => ({
      ...c,
      subject: subjects.find(s => s.id === c.subjectId),
      teacher: users.find(u => u.id === c.teacherId),
      classTime: institutions
        .find(i => i.id === c.institutionId)
        ?.settings.classTimes.find(ct => ct.id === c.classTimeId),
    }));
  };

  const getClass = (id: string) => {
    const cls = classes.find(c => c.id === id);
    if (!cls) return undefined;
    
    return {
      ...cls,
      subject: subjects.find(s => s.id === cls.subjectId),
      teacher: users.find(u => u.id === cls.teacherId),
      classTime: institutions
        .find(i => i.id === cls.institutionId)
        ?.settings.classTimes.find(ct => ct.id === cls.classTimeId),
    };
  };

  const createClass = (cls: Omit<Class, "id">) => {
    const newClass = {
      ...cls,
      id: `class-${Date.now()}`,
    };
    setClasses([...classes, newClass]);
    return newClass;
  };

  const updateClass = (id: string, updates: Partial<Class>) => {
    const newClasses = classes.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    setClasses(newClasses);
    return newClasses.find(c => c.id === id);
  };

  const getAttendanceForClass = (classId: string) => {
    return attendance
      .filter(a => a.classId === classId)
      .map(a => ({
        ...a,
        student: users.find(u => u.id === a.studentId),
      }));
  };

  const getAttendanceForStudent = (studentId: string) => {
    return attendance
      .filter(a => a.studentId === studentId)
      .map(a => ({
        ...a,
        class: getClass(a.classId),
      }));
  };

  const getAttendanceStats = () => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === "present").length;
    const absent = total - present;
    const presenceRate = total ? (present / total) * 100 : 0;
    
    return { total, present, absent, presenceRate };
  };

  const markAttendance = (classId: string, studentId: string, status: Attendance["status"], notes?: string) => {
    const id = `${classId}-${studentId}`;
    const existing = attendance.find(a => a.id === id);
    
    if (existing) {
      const newAttendance = attendance.map(a => 
        a.id === id ? {
          ...a,
          status,
          confirmedAt: status === "present" ? new Date().toISOString() : undefined,
          notes
        } : a
      );
      setAttendance(newAttendance);
    } else {
      const newRecord: Attendance = {
        id,
        classId,
        studentId,
        status,
        confirmedAt: status === "present" ? new Date().toISOString() : undefined,
        notes
      };
      setAttendance([...attendance, newRecord]);
    }
  };

  return {
    getInstitutions,
    getInstitution,
    createInstitution,
    updateInstitution,
    
    getUsers,
    getUser,
    getStudentList,
    createUser,
    updateUser,
    
    getSubjects,
    getSubject,
    createSubject,
    updateSubject,
    
    getClasses,
    getClass,
    createClass,
    updateClass,
    
    getAttendanceForClass,
    getAttendanceForStudent,
    markAttendance,
    getAttendanceStats,
  };
};
