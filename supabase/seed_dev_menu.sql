-- =============================================================================
-- DEV SEED: the seven boxes with FAKE TEST PRICES. Not a migration.
-- =============================================================================
--
-- Run after 003_ordering.sql to have something to order while testing.
-- Every box costs £10.00 and its allergens say "TO BE CONFIRMED". Neither is real:
-- set the real prices and allergens in /admin/menu before turning ordering on.
--
-- Safe to re-run: existing boxes, choices and edits are left alone (nothing is overwritten).
-- =============================================================================

begin;

do $$
declare
  template_id uuid;
  main_menu_id uuid;
  item_id uuid;
  group_id uuid;
  box record;
begin
  select id into template_id from public.menu_templates where slug = 'main';
  select id into main_menu_id from public.active_menus where is_main;
  if template_id is null or main_menu_id is null then
    raise exception 'Main menu not found. Run 003_ordering.sql first.';
  end if;

  for box in
    select *
    from (values
      ('jerk-chicken',  'Jerk Chicken',  1, true),
      ('fried-chicken', 'Fried Chicken', 2, true),
      ('bbq-chicken',   'BBQ Chicken',   3, true),
      ('curry-goat',    'Curry Goat',    4, false),
      ('curry-chicken', 'Curry Chicken', 5, false),
      ('fried-fish',    'Fried Fish',    6, false),
      ('wings',         'Wings',         7, false)
    ) as b (slug, name, display_order, featured)
  loop
    insert into public.menu_template_items
      (menu_template_id, slug, name, description, base_price, allergens, display_order)
    values
      (template_id, box.slug, box.name, 'With mac & cheese, festival and coleslaw.',
       10.00, 'TO BE CONFIRMED', box.display_order)
    on conflict (menu_template_id, slug) do nothing;

    select id into item_id
    from public.menu_template_items
    where menu_template_id = template_id and slug = box.slug;

    insert into public.active_menu_items (active_menu_id, template_item_id, is_featured_item, display_order)
    values (main_menu_id, item_id, box.featured, box.display_order)
    on conflict (active_menu_id, template_item_id) do nothing;

    insert into public.menu_item_option_groups
      (menu_template_item_id, name, is_required, min_selections, max_selections, display_order)
    values (item_id, 'Rice', true, 1, 1, 1)
    on conflict (menu_template_item_id, name) do nothing;

    select id into group_id
    from public.menu_item_option_groups
    where menu_template_item_id = item_id and name = 'Rice';

    insert into public.menu_item_options (option_group_id, name, price_adjustment, display_order)
    values
      (group_id, 'Rice & peas', 0, 1),
      (group_id, 'White rice', 0, 2)
    on conflict (option_group_id, name) do nothing;
  end loop;
end $$;

commit;

-- Check: seven boxes, each with one required Rice choice and two options.
select mti.display_order, mti.name, mti.base_price, mti.allergens,
       g.name as choice, string_agg(o.name, ' / ' order by o.display_order) as options
from public.menu_template_items mti
join public.menu_item_option_groups g on g.menu_template_item_id = mti.id
join public.menu_item_options o on o.option_group_id = g.id
group by mti.display_order, mti.name, mti.base_price, mti.allergens, g.name
order by mti.display_order;
