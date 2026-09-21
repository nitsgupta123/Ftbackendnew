import { useNavigate } from "react-router-dom";
import { useEffect } from "react";


export default function BlogsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/blogs/all", { replace: true });
  }, [navigate]);

  return null;
}
