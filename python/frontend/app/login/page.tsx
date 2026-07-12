"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  alpha,
  Alert,
  Box,
  Button,
  IconButton,
  Link,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Code, DarkMode, LightMode } from "@mui/icons-material";

import { supabase } from "@/lib/supabase";
import { useThemeStore } from "@/store/themeStore";

export default function LoginPage() {
  const router = useRouter();
  const theme = useTheme();

  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Someone already signed in has no business on this page.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // With email confirmation on, there's no session yet — say so rather
        // than dumping the user on a page that bounces them back here.
        if (data.session) {
          router.replace("/");
        } else {
          setNotice("Check your inbox to confirm your email, then sign in.");
          setIsLogin(true);
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      {/* The toggle lives here too — you may want light mode before you sign in. */}
      <Tooltip title={mode === "dark" ? "Light theme" : "Dark theme"}>
        <IconButton
          onClick={toggleMode}
          aria-label="Toggle colour theme"
          sx={{ position: "fixed", top: 16, right: 16, color: "text.secondary" }}
        >
          {mode === "dark" ? <LightMode /> : <DarkMode />}
        </IconButton>
      </Tooltip>

      <Paper
        component="form"
        onSubmit={submit}
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 380,
          p: 4,
          borderRadius: 2,
          bgcolor: "background.paper",
          backdropFilter: "blur(20px)",
          border: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.2),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Code sx={{ color: "primary.main" }} />
          <Typography sx={{ fontWeight: 700, letterSpacing: 1, fontSize: 18 }}>
            CodeNotebook
          </Typography>
        </Box>

        <Typography sx={{ color: "text.secondary", fontSize: 13, mb: 3 }}>
          {isLogin
            ? "Sign in to open your notebooks."
            : "Create an account to get started."}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {notice && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          fullWidth
          required
          autoComplete="email"
          size="small"
          sx={{ mb: 2 }}
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          fullWidth
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
          size="small"
          helperText={isLogin ? undefined : "At least 6 characters"}
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting}
          sx={{ fontWeight: 600, textTransform: "none" }}
        >
          {submitting ? "Working…" : isLogin ? "Sign in" : "Create account"}
        </Button>

        <Typography
          sx={{
            mt: 2.5,
            textAlign: "center",
            fontSize: 13,
            color: "text.secondary",
          }}
        >
          {isLogin ? "No account yet?" : "Already have an account?"}{" "}
          <Link
            component="button"
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setNotice(null);
            }}
            sx={{ color: "primary.main", textDecoration: "none" }}
          >
            {isLogin ? "Create one" : "Sign in"}
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
