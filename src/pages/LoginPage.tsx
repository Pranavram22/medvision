import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { BrainCircuit, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LoginPage() {
  const navigate = useNavigate();
  const { authState, login, signup } = useAuth();
  const { loading, error } = authState;
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState('patient');
  
  const [signupError, setSignupError] = useState<string | null>(null);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(loginEmail, loginPassword);
    
    if (success) {
      navigate('/');
    }
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error
    setSignupError(null);
    
    // Validate form
    if (!signupName || !signupEmail || !signupPassword) {
      setSignupError('All fields are required');
      return;
    }
    
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters long');
      return;
    }

    if (!signupEmail.includes('@')) {
      setSignupError('Please enter a valid email address');
      return;
    }
    
    // Submit signup
    try {
      await signup({
        name: signupName,
        email: signupEmail,
        role: signupRole as 'admin' | 'doctor' | 'patient',
      }, signupPassword);
      
      // Clear form
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setSignupRole('patient');
      
      // Switch to login tab
      document.querySelector('[data-value="login"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    } catch (error) {
      console.error('Signup error:', error);
      setSignupError(error instanceof Error ? error.message : 'Failed to create account');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-primary" />
            <div className="flex flex-col">
              <span className="font-bold text-2xl">MedVision</span>
              <span className="text-xs text-muted-foreground">AI-Powered Medical Diagnostics</span>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Log in to your account</CardTitle>
                <CardDescription>
                  Enter your credentials to access the platform
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <a href="#" className="text-xs text-primary underline-offset-4 hover:underline">
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Quick login accounts:</p>
                    <p className="mb-1">Password for all accounts: <span className="font-bold">password123</span></p>
                    <ul className="list-disc list-inside">
                      <li>doctor@medvision.ai (Doctor view)</li>
                      <li>patient@medvision.ai (Patient view)</li>
                      <li>admin@medvision.ai (Admin view)</li>
                    </ul>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Log in'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>
                  Sign up to access MedVision services
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  {signupError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{signupError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="Enter your full name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="Confirm password"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Account Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={signupRole === 'patient' ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => setSignupRole('patient')}
                      >
                        Patient
                      </Button>
                      <Button
                        type="button"
                        variant={signupRole === 'doctor' ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => setSignupRole('doctor')}
                      >
                        Healthcare Provider
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          By continuing, you agree to our{' '}
          <a href="#" className="text-primary underline-offset-4 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}