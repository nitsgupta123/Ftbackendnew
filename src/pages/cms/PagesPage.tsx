import { useNavigate } from "react-router-dom";
import { useEffect } from "react";


export default function PagesPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/pages/all", { replace: true });
  }, [navigate]);

  return null;
}
