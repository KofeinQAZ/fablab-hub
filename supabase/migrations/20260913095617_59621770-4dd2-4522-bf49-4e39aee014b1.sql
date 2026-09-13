
CREATE TYPE public.inventory_status AS ENUM ('available','checked_out','maintenance');

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_kz text,
  name_en text,
  description text,
  description_kz text,
  description_en text,
  inventory_number text NOT NULL UNIQUE,
  image_url text,
  status public.inventory_status NOT NULL DEFAULT 'available',
  holder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.inventory_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view inventory" ON public.inventory_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage inventory insert" ON public.inventory_items
  FOR INSERT TO authenticated WITH CHECK (public.check_if_admin());
CREATE POLICY "Admins manage inventory update" ON public.inventory_items
  FOR UPDATE TO authenticated USING (public.check_if_admin()) WITH CHECK (public.check_if_admin());
CREATE POLICY "Admins manage inventory delete" ON public.inventory_items
  FOR DELETE TO authenticated USING (public.check_if_admin());

CREATE TABLE public.inventory_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_out_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.inventory_checkouts TO authenticated;
GRANT ALL ON public.inventory_checkouts TO service_role;

ALTER TABLE public.inventory_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own checkouts" ON public.inventory_checkouts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.check_if_admin());

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.checkout_inventory_item(_item_id uuid)
RETURNS public.inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _item public.inventory_items;
  _profile public.profiles;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE id = _uid;
  IF _profile IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF _profile.is_banned THEN
    RAISE EXCEPTION 'user is banned';
  END IF;
  IF _profile.approval_status <> 'approved' THEN
    RAISE EXCEPTION 'account not approved';
  END IF;

  SELECT * INTO _item FROM public.inventory_items WHERE id = _item_id FOR UPDATE;
  IF _item IS NULL THEN
    RAISE EXCEPTION 'item not found';
  END IF;
  IF _item.status = 'maintenance' THEN
    RAISE EXCEPTION 'item in maintenance';
  END IF;
  IF _item.status = 'checked_out' THEN
    IF _item.holder_id = _uid THEN
      RAISE EXCEPTION 'item already yours';
    END IF;
    RAISE EXCEPTION 'item already checked out';
  END IF;

  UPDATE public.inventory_items
    SET status = 'checked_out', holder_id = _uid, checked_out_at = now()
    WHERE id = _item_id
    RETURNING * INTO _item;

  INSERT INTO public.inventory_checkouts (item_id, user_id) VALUES (_item_id, _uid);

  RETURN _item;
END;
$$;

CREATE OR REPLACE FUNCTION public.return_inventory_item(_item_id uuid)
RETURNS public.inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _item public.inventory_items;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO _item FROM public.inventory_items WHERE id = _item_id FOR UPDATE;
  IF _item IS NULL THEN
    RAISE EXCEPTION 'item not found';
  END IF;
  IF _item.status <> 'checked_out' THEN
    RAISE EXCEPTION 'item is not checked out';
  END IF;
  IF _item.holder_id <> _uid AND NOT public.check_if_admin() THEN
    RAISE EXCEPTION 'not your item';
  END IF;

  UPDATE public.inventory_checkouts
    SET returned_at = now()
    WHERE item_id = _item_id AND returned_at IS NULL;

  UPDATE public.inventory_items
    SET status = 'available', holder_id = NULL, checked_out_at = NULL
    WHERE id = _item_id
    RETURNING * INTO _item;

  RETURN _item;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkout_inventory_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_inventory_item(uuid) TO authenticated;
