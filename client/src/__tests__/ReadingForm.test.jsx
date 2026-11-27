import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadingForm from '../components/ReadingForm.jsx';
import { ApiError } from '../api/client.js';

/**
 * Today's date in the browser, as `YYYY-MM-DD`.
 *
 * @returns {string}
 */
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * @param {string} value
 */
function typeValue(value) {
  fireEvent.change(screen.getByLabelText(/glucose value/i), { target: { value } });
}

/**
 * @param {string} value
 */
function typeDate(value) {
  fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value } });
}

describe('ReadingForm', () => {
  it('asks for a glucose value when the field is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ReadingForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a value below 40 mg/dl', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ReadingForm onSubmit={onSubmit} />);

    typeValue('39');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a value above 600 mg/dl', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ReadingForm onSubmit={onSubmit} />);

    typeValue('601');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
  });

  it('rejects a value that is not a whole number', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ReadingForm onSubmit={onSubmit} />);

    typeValue('100.5');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
  });

  it('rejects a date in the future', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ReadingForm onSubmit={onSubmit} />);

    typeValue('120');
    typeDate('2099-01-01');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText('Date cannot be in the future.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the message of the API when the slot is already taken', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(
        'You already have an After lunch reading for this date.',
        409,
        'SLOT_TAKEN',
        'slot',
      ),
    );
    render(<ReadingForm onSubmit={onSubmit} />);

    typeValue('120');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(
      await screen.findByText('You already have an After lunch reading for this date.'),
    ).toBeInTheDocument();
  });

  it('shows the message of the API when the day already holds four readings', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError('You can add only 4 readings per day.', 400, 'MAX_READINGS_PER_DAY', 'value'),
    );
    render(<ReadingForm onSubmit={onSubmit} />);

    typeValue('120');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText('You can add only 4 readings per day.')).toBeInTheDocument();
  });

  it('submits a valid reading', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReadingForm onSubmit={onSubmit} />);

    typeValue('120');
    await user.selectOptions(screen.getByLabelText(/time slot/i), 'after_lunch');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(onSubmit).toHaveBeenCalledWith({ date: today(), slot: 'after_lunch', value: 120 });
  });

  it('fills the form with the values of the reading that is edited', () => {
    render(
      <ReadingForm
        onSubmit={vi.fn()}
        initialValues={{ date: '2026-10-15', slot: 'after_dinner', value: 132 }}
        submitLabel="Update reading"
      />,
    );

    expect(screen.getByLabelText(/^date$/i)).toHaveValue('2026-10-15');
    expect(screen.getByLabelText(/time slot/i)).toHaveValue('after_dinner');
    expect(screen.getByLabelText(/glucose value/i)).toHaveValue(132);
  });
});
