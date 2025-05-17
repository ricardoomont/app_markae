
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMockData } from "@/hooks/useMockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { QRCodeSVG } from "qrcode.react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

const ConfirmAttendance = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { getClass, markAttendance, getClasses } = useMockData();
  
  const [confirmationCode, setConfirmationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [classInfo, setClassInfo] = useState<any | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(classId || null);
  const [classes, setClasses] = useState<any[]>([]);
  const [qrCodeValue, setQrCodeValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [codeExpired, setCodeExpired] = useState(false);

  // Load classes
  useEffect(() => {
    const fetchedClasses = getClasses();
    // Only show today's classes or future classes
    const today = new Date().toISOString().split('T')[0];
    const relevantClasses = fetchedClasses.filter(c => c.date >= today);
    setClasses(relevantClasses);
    
    if (classId && !selectedClass) {
      setSelectedClass(classId);
    }
  }, [classId]);

  // Load class info when selected
  useEffect(() => {
    if (selectedClass) {
      const cls = getClass(selectedClass);
      setClassInfo(cls);
      generateNewCode();
    }
  }, [selectedClass]);

  // Countdown timer for code expiration
  useEffect(() => {
    if (!generatedCode) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCodeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [generatedCode]);

  const generateNewCode = () => {
    // Generate a 6-digit code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(newCode);
    setQrCodeValue(newCode);
    setTimeLeft(60);
    setCodeExpired(false);
  };

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };

  const verifyAttendance = () => {
    if (confirmationCode === generatedCode && !codeExpired) {
      if (selectedClass && user) {
        // Mark attendance as present
        markAttendance(selectedClass, user.id, "present");
        toast.success("Presença confirmada com sucesso!");
        navigate("/dashboard");
      }
    } else if (codeExpired) {
      toast.error("Código expirado. Gere um novo código.");
    } else {
      toast.error("Código incorreto. Tente novamente.");
    }
  };

  // Display for teachers to show QR code
  const showQRCode = user?.role === "teacher" || user?.role === "admin" || user?.role === "coordinator";
  
  // Display for students to enter confirmation code
  const showConfirmForm = user?.role === "student";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {showQRCode ? "Gerar Código de Presença" : "Confirmar Presença"}
        </h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selecione a Aula</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class">Aula</Label>
              <Select value={selectedClass || ""} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma aula" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.subject?.name || "Aula"} - {new Date(cls.date).toLocaleDateString('pt-BR')} ({cls.classTime?.startTime} - {cls.classTime?.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {classInfo && (
              <div className="pt-2">
                <p className="text-sm font-medium">Informações da aula:</p>
                <p className="text-sm text-muted-foreground">Disciplina: {classInfo.subject?.name}</p>
                <p className="text-sm text-muted-foreground">Professor: {classInfo.teacher?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Horário: {classInfo.classTime?.startTime} - {classInfo.classTime?.endTime}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClass && showQRCode && (
        <Card>
          <CardHeader>
            <CardTitle>Código de Confirmação</CardTitle>
            <CardDescription>
              Compartilhe este código ou QR code com os alunos para confirmar presença
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="text-4xl font-bold tracking-wider">
              {generatedCode}
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={qrCodeValue} size={200} />
            </div>
            
            <div className={`text-sm font-medium ${codeExpired ? "text-red-500" : timeLeft <= 10 ? "text-amber-500" : ""}`}>
              {codeExpired ? (
                "Código expirado. Gere um novo código."
              ) : (
                `Código expira em: ${timeLeft} segundos`
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={generateNewCode} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Gerar Novo Código
            </Button>
          </CardFooter>
        </Card>
      )}

      {selectedClass && showConfirmForm && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar Presença</CardTitle>
            <CardDescription>
              Digite o código fornecido pelo professor para confirmar sua presença
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirmationCode">Código de Confirmação</Label>
                <Input
                  id="confirmationCode"
                  type="text"
                  placeholder="Digite o código de 6 dígitos"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={verifyAttendance}>
              Confirmar Presença
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default ConfirmAttendance;
