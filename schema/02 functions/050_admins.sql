-- ============================================================
-- RPC: ADMIN ACCOUNT
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_admin_api(
    p_email VARCHAR(255),
    p_password_hash TEXT
)
RETURNS TABLE(id INT, email VARCHAR(255))
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO public.admins AS a (email, password_hash)
    VALUES (p_email, p_password_hash)
    RETURNING a.id, a.email;
END;
$$;
