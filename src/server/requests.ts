import { supabase } from '../integrations/supabase/client';

// 1. Функция для студента: Подать заявку
export async function submitAccessRequest({ data }: { data: { type: 'safety_briefing' | 'residency' } }) {
  const { type } = data;
  
  // Получаем текущего юзера
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  // Приводим к any, чтобы TS не ругался на новую таблицу в БД
  const { data: existing } = await (supabase as any)
    .from('access_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', type)
    .eq('status', 'pending')
    .single();

  if (existing) {
    throw new Error('У вас уже есть активная заявка этого типа.');
  }

  // Создаем заявку 
  const { error } = await (supabase as any)
    .from('access_requests')
    .insert({
      user_id: user.id,
      type: type,
      status: 'pending'
    });

  if (error) throw new Error(error.message);
  return { success: true, message: 'Заявка успешно отправлена!' };
}

// 2. Функция для админа: Одобрить заявку
export async function approveAccessRequest({ data }: { data: { requestId: string } }) {
  const { requestId } = data;

  // Получаем саму заявку
  const { data: request, error: reqError } = await (supabase as any)
    .from('access_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqError || !request) throw new Error('Заявка не найдена');

  // 1. Меняем статус заявки на approved 
  const { error: updateReqError } = await (supabase as any)
    .from('access_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateReqError) throw new Error(updateReqError.message);

  // 2. Обновляем профиль юзера 
  let profileUpdate: Record<string, any> = {};
  if (request.type === 'safety_briefing') {
    profileUpdate = { safety_briefing_passed: true };
  } else if (request.type === 'residency') {
    profileUpdate = { role: 'resident', safety_briefing_passed: true };
  }

  const { error: profileError } = await (supabase as any)
    .from('profiles')
    .update(profileUpdate)
    .eq('id', request.user_id);

  if (profileError) throw new Error('Ошибка при обновлении профиля: ' + profileError.message);

  return { success: true, message: 'Заявка одобрена, права выданы!' };
}