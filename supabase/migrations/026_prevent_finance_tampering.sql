-- Protection col-level des champs financiers de assistance_requests.
-- La RLS est row-level et ne restreint pas les colonnes : un assisteur/loueur
-- pouvait, via un UPDATE client direct (le mode de requestService.ts), falsifier
-- payment_status / amount_due_to_loueur / commission_* sur un dossier de son org.
-- Ces colonnes ne sont écrites légitimement QUE par la route admin finance
-- (service-role → auth.uid() IS NULL → le trigger les laisse passer).
--
-- On ne protège que des colonnes que le client n'écrit jamais dans requestToRow
-- (colonnes monétaires) + payment_status (enum texte, round-trip fidèle) →
-- `IS DISTINCT FROM` ne bloque qu'une modification réelle, jamais un round-trip.
-- Les timestamps admin (admin_updated_at…) sont volontairement exclus (précision
-- JS Date ≠ microseconde Postgres → risque de faux positif). Idempotent.
CREATE OR REPLACE FUNCTION "public"."prevent_finance_tampering"() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
  AS $$
  BEGIN
    IF auth.uid() IS NOT NULL AND (
         NEW.commission_rate         IS DISTINCT FROM OLD.commission_rate
      OR NEW.commission_amount       IS DISTINCT FROM OLD.commission_amount
      OR NEW.total_amount_ht         IS DISTINCT FROM OLD.total_amount_ht
      OR NEW.amount_due_to_loueur    IS DISTINCT FROM OLD.amount_due_to_loueur
      OR NEW.confirmed_price_per_day IS DISTINCT FROM OLD.confirmed_price_per_day
      OR NEW.confirmed_duration_days IS DISTINCT FROM OLD.confirmed_duration_days
      OR NEW.payment_status          IS DISTINCT FROM OLD.payment_status
      OR NEW.payment_validated_at    IS DISTINCT FROM OLD.payment_validated_at
      OR NEW.payment_validated_by    IS DISTINCT FROM OLD.payment_validated_by
    ) THEN
      RAISE EXCEPTION 'Modification des champs financiers réservée à l''administration.';
    END IF;
    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS "trg_prevent_finance_tampering" ON "public"."assistance_requests";
CREATE TRIGGER "trg_prevent_finance_tampering" BEFORE UPDATE ON "public"."assistance_requests"
  FOR EACH ROW EXECUTE FUNCTION "public"."prevent_finance_tampering"();
